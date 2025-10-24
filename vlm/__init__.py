"""
VLM (Vision Language Model) module — provides image analysis using Google Generative AI.
Main export: analyze_image_bytes() function for analyzing food label images.
"""

from .vlm import analyze_image_bytes

__all__ = ["analyze_image_bytes"]
