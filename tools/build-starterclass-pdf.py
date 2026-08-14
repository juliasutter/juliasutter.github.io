from pathlib import Path
import sys

from reportlab.lib.pagesizes import A5
from reportlab.pdfgen import canvas


image_path, output_path = sys.argv[1:3]
Path(output_path).parent.mkdir(parents=True, exist_ok=True)
page_width, page_height = A5
pdf = canvas.Canvas(output_path, pagesize=A5, pageCompression=1)
pdf.drawImage(image_path, 0, 0, width=page_width, height=page_height, preserveAspectRatio=False)
pdf.showPage()
pdf.save()
