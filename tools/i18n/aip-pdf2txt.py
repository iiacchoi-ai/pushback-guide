# tools/i18n/aip-pdf2txt.py — AIP RKSI 텍스트 PDF 에서 페이지별 텍스트를 덤프한다 (pypdf).
# 사용: python tools/i18n/aip-pdf2txt.py "<PDF 경로>" tools/i18n/aip-text.txt
# 페이지 구분자 "===== PAGE n =====" 를 넣어 aip-extract.mjs 가 페이지 번호를 알 수 있게 한다.
import sys
from pypdf import PdfReader

src, dst = sys.argv[1], sys.argv[2]
r = PdfReader(src)
with open(dst, "w", encoding="utf-8", newline="\n") as f:
    for i, p in enumerate(r.pages, 1):
        f.write(f"===== PAGE {i} =====\n")
        f.write((p.extract_text() or "") + "\n")
print("pages", len(r.pages))
