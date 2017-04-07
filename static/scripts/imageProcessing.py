# -*- coding: utf-8 -*-

import sys, os
import numpy as np
import cv2
from PIL import Image
import httplib, urllib, base64, json

def order_points(pts):
    # initialzie a list of coordinates that will be ordered
    # such that the first entry in the list is the top-left,
    # the second entry is the top-right, the third is the
    # bottom-right, and the fourth is the bottom-left
    rect = np.zeros((4, 2), dtype = "float32")

    # the top-left point will have the smallest sum, whereas
    # the bottom-right point will have the largest sum
    s = pts.sum(axis = 1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]

    # now, compute the difference between the points, the
    # top-right point will have the smallest difference,
    # whereas the bottom-left will have the largest difference
    diff = np.diff(pts, axis = 1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]

    # return the ordered coordinates
    return rect

def auto_scan_image(imgpath, minImgPath):
    # load the image and compute the ratio of the old height
    # to the new height, clone it, and resize it
    # document.jpg ~ docuemnt7.jpg


    image = cv2.imread(imgpath)
    orig = image.copy()
    r = 800.0 / image.shape[0]
    dim = (int(image.shape[1] * r), 800)
    image = cv2.resize(image, dim, interpolation = cv2.INTER_AREA)

    # convert the image to grayscale, blur it, and find edges
    # in the image
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    edged = cv2.Canny(gray, 75, 200)

    # show the original image and the edge detected image

    # find the contours in the edged image, keeping only the
    # largest ones, and initialize the screen contour
    (cnts, _) = cv2.findContours(edged.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    cnts = sorted(cnts, key = cv2.contourArea, reverse = True)[:5]

    # loop over the contours
    for c in cnts:
        # approximate the contour
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)

        # if our approximated contour has four points, then we
        # can assume that we have found our screen
        if len(approx) == 4:
            screenCnt = approx
            break

    if 'screenCnt' in locals():
        cv2.drawContours(image, [screenCnt], -1, (0, 255, 0), 2)

        rect = order_points(screenCnt.reshape(4, 2) / r)
        (topLeft, topRight, bottomRight, bottomLeft) = rect

        w1 = abs(bottomRight[0] - bottomLeft[0])
        w2 = abs(topRight[0] - topLeft[0])
        h1 = abs(topRight[1] - bottomRight[1])
        h2 = abs(topLeft[1] - bottomLeft[1])
        maxWidth = max([w1, w2])
        maxHeight = max([h1, h2])

        dst = np.float32([[0,0], [maxWidth-1,0],
                          [maxWidth-1,maxHeight-1], [0,maxHeight-1]])

        M = cv2.getPerspectiveTransform(rect, dst)
        warped = cv2.warpPerspective(orig, M, (maxWidth, maxHeight))
        cv2.imwrite(minImgPath, warped)
    else:
        warped = edged
        cv2.imwrite(minImgPath, orig)


    # convert the warped image to grayscale, then threshold it
    # to give it that 'black and white' paper effect
    warped = cv2.cvtColor(orig, cv2.COLOR_BGR2GRAY)
    warped = cv2.adaptiveThreshold(warped, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 21, 10)

    # show the original and scanned images
    # cv2.imshow("Original", orig)
    # cv2.imshow("Scanned", warped)
    # cv2.waitKey(0)
    # cv2.destroyAllWindows()
    # cv2.waitKey(1)

    cv2.imwrite('scannedImage.png', warped)
    data = open('scannedImage.png', 'rb').read()

    return data

def print_text(json_data):
    result = json.loads(json_data)
    response = ""

    for l in result['regions']:
        for w in l['lines']:
            line = []
            for r in w['words']:
                line.append(r['text'])
            response += ''.join(line)

    return response

def ocr_project_oxford(headers, params, data):
    conn = httplib.HTTPSConnection('westus.api.cognitive.microsoft.com')
    conn.request("POST", "/vision/v1.0/ocr?%s" % params, data, headers=headers)
    response = conn.getresponse()
    data = response.read()
    conn.close()
    return print_text(data)

if __name__ == '__main__':
    reload(sys)
    sys.setdefaultencoding('utf-8')

    image = auto_scan_image(sys.argv[1], sys.argv[2])

    headers = {
        # Request headers
        'Content-Type': 'application/octet-stream',
        'Ocp-Apim-Subscription-Key': '424c653690d44d56b26c90174c13af46',
    }
    params = urllib.urlencode({
        # Request parameters
        'language': 'en',
        'detectOrientation ': 'false',
    })

    try:
        print ocr_project_oxford(headers, params, image)
    except Exception as e:
        print(e)