try: 
    import Image
except ImportError:
    from PIL import Image
import pytesseract

import cv2

cam = cv2.VideoCapture(0)

cv2.namedWindow("test")

img_counter = 1

while True:
    ret, frame = cam.read()
    if not ret:
        print("failed to grab frame")
        break
    cv2.imshow("test", frame)

    k = cv2.waitKey(1)
    if k%256 == 27:
        # ESC pressed
        print("Escape hit, closing...")
        break
    elif k%256 == 32:
        # SPACE pressed
        img_name = "test{}.png".format(img_counter)
        cv2.imwrite(img_name, frame)
        print("{} written!".format(img_name))
        img_counter += 1

cam.release()

cv2.destroyAllWindows()

pytesseract.pytesseract.tesseract_cmd=r'C:\Users\SANJAY\AppData\Local\Programs\Tesseract-OCR\tesseract'
print(pytesseract.image_to_string(Image.open('test1.png')))