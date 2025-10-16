try: 
    import Image
except ImportError:
    from PIL import Image
import pytesseract

pytesseract.pytesseract.tesseract_cmd=r'C:\Users\SANJAY\AppData\Local\Programs\Tesseract-OCR\tesseract'
print(pytesseract.image_to_string(Image.open('test1.jpg')))