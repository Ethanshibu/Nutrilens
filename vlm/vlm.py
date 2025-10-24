import os
import io
import sys
from pathlib import Path

# Import google generative AI client. Different versions expose different import paths.
genai = None
import_error = None
try:
	# preferred namespaced import
	import google.generativeai as genai
except Exception as e1:
	import_error = e1
	try:
		# alternative style used in some samples
		from google import genai
	except Exception as e2:
		import_error = e2

if genai is None:
	print("Missing dependency: google-generativeai. Install with: pip install google-generativeai", file=sys.stderr)
	if import_error:
		print("Import error:", import_error, file=sys.stderr)
	raise SystemExit(1)

from PIL import Image


# --- Configuration (use environment variables) ---
# Set these in your shell instead of hardcoding keys.

API_KEY = os.environ.get("GOOGLE_API_KEY")
MODEL_NAME = os.environ.get("GOOGLE_MODEL", "gemini-2.5-flash")

if not API_KEY:
	print("ERROR: GOOGLE_API_KEY not set. Set it in your environment (PowerShell: $env:GOOGLE_API_KEY = '...')", file=sys.stderr)
	raise SystemExit(1)

# Configure client
# Create client. The google genai client can pick up credentials from env, but we pass the key explicitly if available.
client = None
model_fallback = None
try:
	# Prefer the newer Client API if available
	if hasattr(genai, "Client"):
		client_kwargs = {}
		if API_KEY:
			client_kwargs["api_key"] = API_KEY
		client = genai.Client(**client_kwargs)
	else:
		# older API: configure + GenerativeModel
		if hasattr(genai, "configure"):
			genai.configure(api_key=API_KEY)
		if hasattr(genai, "GenerativeModel"):
			model_fallback = genai.GenerativeModel
except Exception as e:
	print("Failed to initialize genai client/model:", e, file=sys.stderr)
	raise


# --- Model and Image Loading ---
image_file_name = "label3.png"  # change to your file if needed
img_path = Path(image_file_name)
if not img_path.exists():
	print(f"Image not found: {img_path}\nPlace your image as '{image_file_name}' or update the script.", file=sys.stderr)
	raise SystemExit(1)

img = Image.open(img_path)

# --- The Prompt ---
prompt = """
IMPORTANT: Respond with a single, valid JSON object only. Do not include any explanatory text, markdown, or surrounding backticks.
Produce a JSON object with these keys:
- product_name: string or null
- nutrition_facts: object with keys calories, total_fat, sodium, total_sugars (values as strings or null)
- ingredients: string or null
- allergens: array of strings or null

Extract these fields from the provided food package label image.
If a field is not present, use null for its value.
Return only the JSON object.
"""


def _image_to_bytes(pil_image, fmt="PNG"):
	buf = io.BytesIO()
	pil_image.save(buf, format=fmt)
	buf.seek(0)
	return buf


def main():
	print(f"Analyzing {image_file_name} with model {MODEL_NAME}...")

	# Use the Client.models.generate_content API pattern (per AI Studio examples).
	# We'll provide contents as a list where the prompt is first and the image bytes second.
	img_buf = _image_to_bytes(img)
	img_buf.seek(0)
	image_bytes = img_buf.read()

	attempt_errors = []

	# Choose API path depending on what's initialized above
	if client is not None and hasattr(client, "models"):
		try:
			print("Using Client.models.generate_content() path")
			response = client.models.generate_content(
				model=MODEL_NAME,
				contents=[
					{"type": "text", "text": prompt},
					{"type": "image", "image": {"image_bytes": image_bytes}},
				],
			)
			print_output(response)
			return
		except Exception as e:
			attempt_errors.append(("client.generate_content", e))
	elif model_fallback is not None:
		try:
			print("Using GenerativeModel.generate_content() fallback path")
			model = model_fallback(MODEL_NAME)
			# Older API often accepts a list with prompt string and PIL image or bytes
			try:
				resp = model.generate_content([prompt, image_bytes])
			except Exception:
				# try PIL image
				resp = model.generate_content([prompt, img])
			print_output(resp)
			return
		except Exception as e:
			attempt_errors.append(("model_fallback.generate_content", e))
	else:
		attempt_errors.append(("no_client_or_model", RuntimeError("no usable genai client or model available")))

	# If we get here none of the attempts worked. Print helpful debugging information.
	print("All attempts to call the model failed. See errors below:", file=sys.stderr)
	for kind, err in attempt_errors:
		print(f"- Attempt ({kind}) raised: {err!r}", file=sys.stderr)
	print("\nCommon fixes:\n - Ensure your google-generativeai package is up-to-date\n - Confirm the MODEL_NAME matches a multimodal model in your AI Studio account (use full name like 'models/...' if required)\n - If AI Studio provides a sample Python snippet for your model, paste/confirm it and adapt the call accordingly.", file=sys.stderr)
	print("\nNo local fallback will be attempted because you requested Gemini-only operation.", file=sys.stderr)
	raise SystemExit(2)


def print_output(resp):
	# The response object may vary by client version. Try to print useful fields.
	print("\n--- Analysis Result ---")
	try:
		# many client versions provide .text or .content
		# 1) direct text
		if hasattr(resp, "text") and resp.text:
			print(resp.text)
			return
		if hasattr(resp, "content") and resp.content:
			print(resp.content)
			return

		# 2) candidates or outputs list
		if hasattr(resp, "candidates") and getattr(resp, "candidates"):
			for c in resp.candidates:
				# candidate may have 'content' or 'output'
				if hasattr(c, "content"):
					print(getattr(c, "content"))
				elif hasattr(c, "output"):
					print(getattr(c, "output"))
				else:
					print(repr(c))
			return

		if hasattr(resp, "outputs") and getattr(resp, "outputs"):
			for out in resp.outputs:
				print(repr(out))
			return

		# 3) binary image bytes
		if isinstance(resp, (bytes, bytearray)):
			_save_image_bytes(resp)
			return

		# 4) attempt to coerce to dict/json
		try:
			import json
			d = dict(resp)
			print(json.dumps(d, indent=2))
			return
		except Exception:
			pass

		# final fallback
		print(repr(resp))
	except Exception as e:
		print("Failed to pretty-print response:", e, file=sys.stderr)
		print(repr(resp))
	print("---------------------\n")


def _save_image_bytes(b: bytes, out_name: str = "gemini_output.png"):
	"""Save raw bytes to a file if they look like an image (PNG/JPEG)."""
	try:
		sig = b[:8]
		if sig.startswith(b"\x89PNG\r\n\x1a\n"):
			with open(out_name, "wb") as fh:
				fh.write(b)
			print(f"Model returned PNG bytes; saved to {out_name}")
			return
		# JPEG start
		if b.startswith(b"\xff\xd8"):
			with open(out_name, "wb") as fh:
				fh.write(b)
			print(f"Model returned JPEG bytes; saved to {out_name}")
			return
		# not recognized: write anyway with .bin
		with open(out_name + ".bin", "wb") as fh:
			fh.write(b)
		print(f"Model returned bytes; saved to {out_name}.bin")
	except Exception as e:
		print("Failed to save image bytes:", e, file=sys.stderr)





if __name__ == "__main__":
	main()


















