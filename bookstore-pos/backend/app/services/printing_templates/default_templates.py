import json


def default_template_schema(document_type: str, paper_code: str = "THERMAL_80") -> str:
    paper_width = 80.0 if paper_code == "THERMAL_80" else 58.0 if paper_code == "THERMAL_58" else 210.0
    paper_height = None if paper_code.startswith("THERMAL") else 297.0 if paper_code == "A4" else 148.0
    payload = {
        "schema_version": 1,
        "paper": {
            "code": paper_code,
            "width_mm": paper_width,
            "height_mm": paper_height,
            "margins_mm": {"top": 2, "right": 2, "bottom": 2, "left": 2},
        },
        "styles": {
            "base_font_family": "Arial",
            "base_font_size": 9,
        },
        "elements": [
            {
                "id": "company_name",
                "type": "text",
                "x_mm": 5,
                "y_mm": 6,
                "w_mm": max(40, paper_width - 10),
                "h_mm": 6,
                "visible": True,
                "content": "{{company_name}}",
                "style": {"align": "center", "font_size": 11, "bold": True},
            },
            {
                "id": "document_header",
                "type": "text",
                "x_mm": 5,
                "y_mm": 14,
                "w_mm": max(40, paper_width - 10),
                "h_mm": 5,
                "visible": True,
                "content": f"{document_type} {{document_number}}",
                "style": {"align": "center", "font_size": 9, "bold": True},
            },
            {
                "id": "items",
                "type": "items_table",
                "x_mm": 3,
                "y_mm": 24,
                "w_mm": max(40, paper_width - 6),
                "h_mm": None,
                "visible": True,
                "config": {"show_header": True, "columns": ["name", "qty", "unit_price", "line_total"]},
            },
            {
                "id": "totals",
                "type": "totals_block",
                "x_mm": 3,
                "y_mm": 0,
                "w_mm": max(40, paper_width - 6),
                "h_mm": None,
                "visible": True,
            },
            {
                "id": "footer",
                "type": "text",
                "x_mm": 5,
                "y_mm": 0,
                "w_mm": max(40, paper_width - 10),
                "h_mm": 6,
                "visible": True,
                "content": "{{receipt_footer}}",
                "style": {"align": "center", "font_size": 8, "bold": False},
            },
        ],
    }
    return json.dumps(payload, ensure_ascii=False)
