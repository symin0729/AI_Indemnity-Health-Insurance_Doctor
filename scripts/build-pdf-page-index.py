"""PDF 페이지별 글자 색인을 만든다 (공백 제거). RAGFlow 컨테이너 안에서 실행한다.

  docker cp <PDF> docker-ragflow-cpu-1:/tmp/in.pdf
  docker exec -i docker-ragflow-cpu-1 /ragflow/.venv/bin/python - /tmp/in.pdf /tmp/index.json < scripts/build-pdf-page-index.py
  docker cp docker-ragflow-cpu-1:/tmp/index.json <출력 위치>

평가 스크립트가 청크 글자와 비교해 청크가 어느 페이지에서 왔는지 찾는 데만 쓴다.
약관 원문 전체가 들어 있으므로 저장소에 커밋하지 않는다.
"""
import json
import re
import sys

import pypdf

src, dst = sys.argv[1], sys.argv[2]
reader = pypdf.PdfReader(src)
pages = {str(i + 1): re.sub(r"\s+", "", page.extract_text() or "") for i, page in enumerate(reader.pages)}
json.dump({"pages": pages}, open(dst, "w", encoding="utf-8"), ensure_ascii=False)
print("pages:", len(pages))
