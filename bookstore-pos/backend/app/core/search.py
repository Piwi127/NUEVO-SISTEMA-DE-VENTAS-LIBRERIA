import unicodedata

from sqlalchemy import func


def normalize_search_text(value: str) -> str:
    normalized = unicodedata.normalize("NFD", (value or "").lower().strip())
    without_accents = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    return " ".join(without_accents.split())


def compact_search_text(value: str) -> str:
    return "".join(ch for ch in normalize_search_text(value) if ch.isalnum())


def singularize_token(token: str) -> str:
    if len(token) <= 3:
        return token
    if token.endswith("ces") and len(token) > 4:
        return f"{token[:-3]}z"
    if token.endswith("es") and len(token) > 4:
        return token[:-2]
    if token.endswith("s") and len(token) > 3:
        return token[:-1]
    return token


def split_search_terms(value: str) -> list[str]:
    normalized = normalize_search_text(value)
    if not normalized:
        return []
    return [singularize_token(token) for token in normalized.split() if token]


def normalized_column(column):
    value = func.lower(func.coalesce(column, ""))
    replacements = (
        ("\u00e1", "a"),
        ("\u00e9", "e"),
        ("\u00ed", "i"),
        ("\u00f3", "o"),
        ("\u00fa", "u"),
        ("\u00fc", "u"),
        ("\u00f1", "n"),
    )
    for source, target in replacements:
        value = func.replace(value, source, target)
    return value


def compact_column(column):
    value = normalized_column(column)
    for token in (" ", "-", ".", "/", "_", ":"):
        value = func.replace(value, token, "")
    return value
