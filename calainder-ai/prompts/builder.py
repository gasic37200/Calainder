from .common import build_common_prompt
from .image import IMAGE_PROMPT_RULES
from .text import TEXT_PROMPT_RULES

# 반환값 str
def build_text_prompt(today: str, current_datetime: str) -> str:
    return build_common_prompt(today, current_datetime) + "\n\n" + TEXT_PROMPT_RULES

def build_image_prompt(today: str, current_datetime: str) -> str:
    return build_common_prompt(today, current_datetime) + "\n\n" + IMAGE_PROMPT_RULES
