from pathlib import Path
import sys

from reportlab.graphics import renderSVG
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing


url, output_path = sys.argv[1:3]
widget = qr.QrCodeWidget(url, barLevel="H")
x1, y1, x2, y2 = widget.getBounds()
width = x2 - x1
height = y2 - y1
drawing = Drawing(width, height, transform=[1, 0, 0, 1, -x1, -y1])
drawing.add(widget)
Path(output_path).parent.mkdir(parents=True, exist_ok=True)
renderSVG.drawToFile(drawing, output_path)
