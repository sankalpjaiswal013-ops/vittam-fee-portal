import os
import sys
import argparse
from PIL import Image, ImageDraw, ImageFont

def get_font(font_path, font_size):
    """Try to load a TrueType font, otherwise fall back to default PIL font."""
    if font_path:
        try:
            return ImageFont.truetype(font_path, font_size)
        except Exception as e:
            print(f"Warning: Could not load specified font at {font_path}. Error: {e}")
            
    # Common system fonts for Windows
    windows_fonts = [
        "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\segoeui.ttf",
        "C:\\Windows\\Fonts\\calibri.ttf",
        "C:\\Windows\\Fonts\\tahoma.ttf",
    ]
    
    for path in windows_fonts:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, font_size)
            except Exception:
                continue
                
    print("Warning: Could not load any system TrueType fonts. Falling back to default low-resolution font.")
    return ImageFont.load_default()

def hex_to_rgb(hex_str):
    """Convert hex color string (e.g., '#FFFFFF') to RGB tuple."""
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

def draw_grid(image_path, output_path):
    """Draw a pixel ruler and coordinate grid on the image to help the user identify coordinates."""
    img = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(img)
    width, height = img.size
    
    # Try loading a small font
    font = get_font(None, 10)
    
    # Draw vertical lines/rulers every 100 pixels, and minor ticks every 50 pixels
    for x in range(0, width, 50):
        color = (255, 0, 0) if x % 100 == 0 else (200, 200, 200)
        width_line = 2 if x % 100 == 0 else 1
        draw.line([(x, 0), (x, height)], fill=color, width=width_line)
        if x % 100 == 0 and x < width - 20:
            draw.text((x + 2, 10), str(x), fill=(255, 0, 0), font=font)
            draw.text((x + 2, height - 20), str(x), fill=(255, 0, 0), font=font)
            
    # Draw horizontal lines/rulers every 100 pixels, and minor ticks every 50 pixels
    for y in range(0, height, 50):
        color = (0, 0, 255) if y % 100 == 0 else (200, 200, 200)
        width_line = 2 if y % 100 == 0 else 1
        draw.line([(0, y), (width, y)], fill=color, width=width_line)
        if y % 100 == 0 and y < height - 10:
            draw.text((10, y + 2), str(y), fill=(0, 0, 255), font=font)
            draw.text((width - 40, y + 2), str(y), fill=(0, 0, 255), font=font)
            
    img.save(output_path)
    print(f"\n[Grid Mode] Reference grid image saved successfully to: {output_path}")
    print("Please open this image and identify:")
    print("  1. The x-coordinate of the center of the first year (1981) label.")
    print("  2. The x-coordinate of the center of the last year (2023) label.")
    print("  3. The y-range (y_start and y_end) that tightly bounds the crowded year labels.")
    print("  4. The background color of the chart (so we can erase the old labels).")

def clean_labels(image_path, output_path, x_start, x_end, y_start, y_end, bg_color_hex, text_color_hex, font_size, font_path, step, start_year, end_year):
    """Erase the existing x-axis labels and redraw clean, spaced out labels."""
    img = Image.open(image_path).convert("RGB")
    draw = ImageDraw.Draw(img)
    
    bg_color = hex_to_rgb(bg_color_hex)
    text_color = hex_to_rgb(text_color_hex)
    font = get_font(font_path, font_size)
    
    # 1. Erase old labels by drawing a solid rectangle over them
    # Ensure y_start is smaller than y_end
    y_min, y_max = min(y_start, y_end), max(y_start, y_end)
    # We extend x bounds slightly to cover any overhang of labels at the edges
    width, _ = img.size
    draw.rectangle([((x_start - 30) if x_start - 30 >= 0 else 0, y_min), (min(x_end + 30, width), y_max)], fill=bg_color)
    
    # 2. Determine which years to label
    # We label years from start_year to end_year.
    # To be clean, we usually label multiples of the step (e.g. 1985, 1990...) and optionally the start and end years.
    years_to_label = []
    
    # Generate labels at standard increments
    # Find the first multiple of step >= start_year
    first_step_year = ((start_year + step - 1) // step) * step
    for y in range(first_step_year, end_year + 1, step):
        years_to_label.append(y)
        
    # Always include start_year if not already present
    if start_year not in years_to_label:
        years_to_label.insert(0, start_year)
    # Always include end_year if not already present
    if end_year not in years_to_label:
        years_to_label.append(end_year)
        
    # Sort them to keep order
    years_to_label = sorted(list(set(years_to_label)))
    
    # 3. Calculate position and draw each label
    span_years = end_year - start_year
    span_pixels = x_end - x_start
    
    y_center = (y_min + y_max) / 2
    
    print(f"\nRedrawing x-axis labels for years: {years_to_label}")
    
    for year in years_to_label:
        # Calculate linear interpolation of pixel coordinate
        t = (year - start_year) / span_years
        x = x_start + t * span_pixels
        
        text = str(year)
        
        # In Pillow, to center text:
        # We can use draw.text(..., anchor="mm") which centers both horizontally and vertically
        # Standard anchor="mm" works with TrueType fonts. If fallback font is used, anchor might fail,
        # so we handle it gracefully.
        try:
            draw.text((x, y_center), text, fill=text_color, font=font, anchor="mm")
        except Exception:
            # Fallback text bounding box calculation for standard font
            # Get text size
            try:
                left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
                text_w = right - left
                text_h = bottom - top
            except Exception:
                text_w = len(text) * 6
                text_h = 10
            draw.text((x - text_w / 2, y_center - text_h / 2), text, fill=text_color, font=font)
            
    img.save(output_path)
    print(f"[Clean Mode] Cleaned image saved successfully to: {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clean up crowded x-axis labels on chart screenshots.")
    parser.add_argument("--input", required=True, help="Path to the input chart screenshot image.")
    parser.add_argument("--output", required=True, help="Path to save the output image.")
    parser.add_argument("--mode", choices=["grid", "clean"], default="clean", 
                        help="Mode: 'grid' creates an image with pixel coordinate overlays to locate labels; 'clean' performs the actual replacement.")
    
    # Parameters for 'clean' mode
    parser.add_argument("--x-start", type=int, help="Pixel X-coordinate of the first year (e.g. 1981) tick/label.")
    parser.add_argument("--x-end", type=int, help="Pixel X-coordinate of the last year (e.g. 2023) tick/label.")
    parser.add_argument("--y-start", type=int, help="Y-coordinate where the label area starts.")
    parser.add_argument("--y-end", type=int, help="Y-coordinate where the label area ends.")
    
    # Customization parameters
    parser.add_argument("--bg-color", default="#FFFFFF", help="Hex color of the background to cover old labels (e.g., #FFFFFF).")
    parser.add_argument("--text-color", default="#333333", help="Hex color of the new labels (e.g., #333333).")
    parser.add_argument("--font-size", type=int, default=12, help="Font size of the new labels.")
    parser.add_argument("--font-path", default=None, help="Path to a custom TrueType font file.")
    parser.add_argument("--step", type=int, default=5, help="Step size for year labels (e.g., every 5 years).")
    parser.add_argument("--start-year", type=int, default=1981, help="The start year of the chart timeline.")
    parser.add_argument("--end-year", type=int, default=2023, help="The end year of the chart timeline.")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.input):
        print(f"Error: Input file '{args.input}' does not exist.")
        sys.exit(1)
        
    if args.mode == "grid":
        draw_grid(args.input, args.output)
    else:
        # Validate that required clean-mode parameters are provided
        if args.x_start is None or args.x_end is None or args.y_start is None or args.y_end is None:
            print("Error: In 'clean' mode, --x-start, --x-end, --y-start, and --y-end coordinates must be specified.")
            print("Run in 'grid' mode first to visually determine these coordinates from the output grid image.")
            sys.exit(1)
            
        clean_labels(
            image_path=args.input,
            output_path=args.output,
            x_start=args.x_start,
            x_end=args.x_end,
            y_start=args.y_start,
            y_end=args.y_end,
            bg_color_hex=args.bg_color,
            text_color_hex=args.text_color,
            font_size=args.font_size,
            font_path=args.font_path,
            step=args.step,
            start_year=args.start_year,
            end_year=args.end_year
        )
