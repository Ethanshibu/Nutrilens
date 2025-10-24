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
# NOTE: API_KEY and client initialization are now deferred to avoid SystemExit at import time
# when used as a module (e.g., in a FastAPI backend). The check happens in analyze_image_bytes().

MODEL_NAME = os.environ.get("GOOGLE_MODEL", "gemini-2.5-flash")

# Global client holder (initialized lazily)
client = None
model_fallback = None
_client_initialized = False


def _initialize_client():
	"""Lazily initialize the Gemini client on first use."""
	global client, model_fallback, _client_initialized
	
	if _client_initialized:
		return  # Already tried to initialize
	
	_client_initialized = True
	
	API_KEY = os.environ.get("GOOGLE_API_KEY")
	if not API_KEY:
		raise RuntimeError("GOOGLE_API_KEY not set in environment. Set it in your shell: $env:GOOGLE_API_KEY = '...'")
	
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
		raise RuntimeError(f"Failed to initialize genai client/model: {e}")


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
	"""
	Standalone script mode: analyze a local image file (label3.png).
	This is for testing the VLM directly via command line.
	For backend integration, use analyze_image_bytes() which accepts image bytes directly.
	"""
	image_file_name = "label3.png"
	img_path = Path(image_file_name)
	if not img_path.exists():
		print(f"Image not found: {img_path}\nPlace your image as '{image_file_name}' in the vlm/ directory.", file=sys.stderr)
		raise SystemExit(1)
	
	img = Image.open(img_path)
	img_buf = _image_to_bytes(img)
	img_buf.seek(0)
	image_bytes = img_buf.read()
	
	print(f"Analyzing {image_file_name} with model {MODEL_NAME}...")
	
	try:
		result = analyze_image_bytes(image_bytes)
		print("\n--- Analysis Result ---")
		import json
		print(json.dumps(result, indent=2))
		print("---------------------\n")
	except Exception as e:
		print(f"Analysis failed: {e}", file=sys.stderr)
		raise SystemExit(1)



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


def analyze_image_bytes(image_bytes: bytes, model_name: str = None) -> dict:
	"""
	Accepts raw image bytes and returns a parsed result (dict).
	
	Args:
		image_bytes: Raw image file bytes (PNG, JPEG, etc.)
		model_name: Optional override for model name (defaults to env var)
	
	Returns:
		dict: Parsed JSON result from the model with keys:
			- product_name: str or None
			- nutrition_facts: dict (calories, total_fat, sodium, total_sugars) or None
			- ingredients: str or None
			- allergens: list or None
	
	Raises:
		RuntimeError: If model call fails or API key not set
		json.JSONDecodeError: If response cannot be parsed as JSON
	"""
	import json
	
	# Initialize client on first call
	_initialize_client()
	
	if model_name is None:
		model_name = MODEL_NAME
	
	attempt_errors = []
	
	# Choose API path depending on what's initialized
	if client is not None and hasattr(client, "models"):
		try:
			response = client.models.generate_content(
				model=model_name,
				contents=[
					{"type": "text", "text": prompt},
					{"type": "image", "image": {"image_bytes": image_bytes}},
				],
			)
			# Extract text response
			response_text = None
			if hasattr(response, "text") and response.text:
				response_text = response.text
			elif hasattr(response, "content") and response.content:
				response_text = response.content
			
			if response_text:
				# Try to parse as JSON
				parsed = json.loads(response_text)
				return parsed
			else:
				raise RuntimeError("Model returned empty response")
		except Exception as e:
			attempt_errors.append(("client.models.generate_content", e))
	
	elif model_fallback is not None:
		try:
			model = model_fallback(model_name)
			# Older API often accepts a list with prompt string and bytes/PIL image
			try:
				resp = model.generate_content([prompt, image_bytes])
			except Exception:
				# try PIL image conversion
				img = Image.open(io.BytesIO(image_bytes))
				resp = model.generate_content([prompt, img])
			
			response_text = None
			if hasattr(resp, "text") and resp.text:
				response_text = resp.text
			elif hasattr(resp, "content") and resp.content:
				response_text = resp.content
			
			if response_text:
				parsed = json.loads(response_text)
				return parsed
			else:
				raise RuntimeError("Model returned empty response")
		except Exception as e:
			attempt_errors.append(("model_fallback.generate_content", e))
	else:
		attempt_errors.append(("no_client_or_model", RuntimeError("no usable genai client or model available")))
	
	# If we get here, none of the attempts worked
	error_msg = "All attempts to call the model failed:\n"
	for kind, err in attempt_errors:
		error_msg += f"  - {kind}: {repr(err)}\n"
	raise RuntimeError(error_msg)



if __name__ == "__main__":
	main()


















