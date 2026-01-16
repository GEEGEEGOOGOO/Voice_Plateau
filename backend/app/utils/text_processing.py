import re

def clean_text_for_tts(text: str) -> str:
    """
    Remove Markdown formatting and special characters that shouldn't be spoken by TTS.
    """
    if not text:
        return ""
        
    # Remove code blocks
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'`[^`]*`', '', text)
    
    # Remove links [text](url) -> text
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    
    # Remove images ![alt](url) -> ""
    text = re.sub(r'!\[[^\]]*\]\([^\)]+\)', '', text)
    
    # Remove headers (#, ##, etc.)
    text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)
    
    # Remove bold/italic (*, **, _, __)
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # **bold**
    text = re.sub(r'\*([^*]+)\*', r'\1', text)      # *italic*
    text = re.sub(r'__([^_]+)__', r'\1', text)      # __bold__
    text = re.sub(r'_([^_]+)_', r'\1', text)        # _italic_
    
    # Remove list markers (-, *, +) at start of line
    text = re.sub(r'^[\*\-\+]\s+', '', text, flags=re.MULTILINE)
    
    # Remove blockquotes (>)
    text = re.sub(r'^>\s+', '', text, flags=re.MULTILINE)
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text
