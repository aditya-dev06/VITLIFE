import os
import sys
import collections
from PIL import Image, ImageOps

def flood_fill_transparency(img, tolerance=40):
    """Removes solid/near-white backgrounds from stickers with edge preservation."""
    img = img.convert("RGBA")
    width, height = img.size
    pixels = img.load()
    
    def is_similar(p1, p2, tol):
        return sum(abs(c1 - c2) for c1, c2 in zip(p1[:3], p2[:3])) <= tol * 3

    bg_color = pixels[0, 0]
    visited = set()
    queue = [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]
    
    for start_node in queue:
        if start_node not in visited and is_similar(pixels[start_node], bg_color, tolerance):
            bfs_queue = collections.deque([start_node])
            visited.add(start_node)
            while bfs_queue:
                x, y = bfs_queue.popleft()
                pixels[x, y] = (255, 255, 255, 0)
                
                for dx, dy in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited:
                        if is_similar(pixels[nx, ny], bg_color, tolerance):
                            visited.add((nx, ny))
                            bfs_queue.append((nx, ny))
    return img

def resize_image(img, target_width=180):
    width, height = img.size
    target_height = int(target_width * height / width)
    return img.resize((target_width, target_height), Image.Resampling.LANCZOS)

def process_sprite(input_path, output_path, target_width=180):
    print(f"Processing {input_path}...")
    if not os.path.exists(input_path):
        print(f"File not found: {input_path}")
        return None
        
    img = Image.open(input_path)
    img = flood_fill_transparency(img, tolerance=40)
    img = resize_image(img, target_width)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, "PNG")
    print(f"Saved {output_path}")
    return img

def create_breathing_frames(img, base_path):
    offsets = [0, -2, -4, -2]
    width, height = img.size
    for i, offset in enumerate(offsets):
        frame = Image.new("RGBA", (width, height + 8), (0, 0, 0, 0))
        frame.paste(img, (0, 4 + offset), img)
        out_path = f"{base_path}_{i}.png"
        frame.save(out_path, "PNG")
        print(f"Saved breathing frame: {out_path}")

def create_walking_frames(img, base_dir):
    """Generates left and right walking animation frames with slight rotation/bobbing."""
    width, height = img.size
    rotations = [0, -3, 0, 3]
    offsets = [0, -3, 0, -3]

    for i, (rot, off) in enumerate(zip(rotations, offsets)):
        # Right walk frame
        r_frame = img.rotate(rot, resample=Image.Resampling.BICUBIC, expand=False)
        canvas = Image.new("RGBA", (width + 8, height + 8), (0, 0, 0, 0))
        canvas.paste(r_frame, (4, 4 + off), r_frame)
        canvas.save(os.path.join(base_dir, f"rem_walk_right_{i}.png"), "PNG")

        # Left walk frame (horizontally mirrored)
        l_img = ImageOps.mirror(img)
        l_frame = l_img.rotate(-rot, resample=Image.Resampling.BICUBIC, expand=False)
        canvas_l = Image.new("RGBA", (width + 8, height + 8), (0, 0, 0, 0))
        canvas_l.paste(l_frame, (4, 4 + off), l_frame)
        canvas_l.save(os.path.join(base_dir, f"rem_walk_left_{i}.png"), "PNG")
    print("Saved walking animation frames (left & right).")

def create_floating_frames(img, base_dir):
    """Generates smooth floating hovering animation frames."""
    width, height = img.size
    offsets = [0, -4, -8, -12, -8, -4]
    for i, off in enumerate(offsets):
        canvas = Image.new("RGBA", (width + 4, height + 16), (0, 0, 0, 0))
        canvas.paste(img, (2, 14 + off), img)
        canvas.save(os.path.join(base_dir, f"rem_float_{i}.png"), "PNG")
    print("Saved floating hover animation frames.")

def main():
    source_images = {
        'idle': r'C:\Users\Aditya Prakash\.gemini\antigravity\brain\7f8bd9e1-1588-47b5-bb70-19bcbfe1ad41\rem_chibi_idle_1786736576849.jpg',
        'alert': r'C:\Users\Aditya Prakash\.gemini\antigravity\brain\7f8bd9e1-1588-47b5-bb70-19bcbfe1ad41\rem_chibi_alert_1786736611147.jpg',
        'happy': r'C:\Users\Aditya Prakash\.gemini\antigravity\brain\7f8bd9e1-1588-47b5-bb70-19bcbfe1ad41\rem_chibi_happy_1786736943700.jpg',
        'sit': r'C:\Users\Aditya Prakash\.gemini\antigravity\brain\7f8bd9e1-1588-47b5-bb70-19bcbfe1ad41\rem_chibi_sit_1786741120761.jpg',
        'float': r'C:\Users\Aditya Prakash\.gemini\antigravity\brain\7f8bd9e1-1588-47b5-bb70-19bcbfe1ad41\rem_chibi_float_1786741178800.jpg'
    }
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sprites_dir = os.path.join(script_dir, 'sprites')
    os.makedirs(sprites_dir, exist_ok=True)
    
    idle_img = process_sprite(source_images['idle'], os.path.join(sprites_dir, 'rem_idle.png'))
    alert_img = process_sprite(source_images['alert'], os.path.join(sprites_dir, 'rem_alert.png'))
    happy_img = process_sprite(source_images['happy'], os.path.join(sprites_dir, 'rem_happy.png'))
    sit_img = process_sprite(source_images['sit'], os.path.join(sprites_dir, 'rem_sit.png'))
    float_img = process_sprite(source_images['float'], os.path.join(sprites_dir, 'rem_float.png'))
    
    if idle_img:
        # Create tray icon
        icon_img = idle_img.resize((32, 32), Image.Resampling.LANCZOS)
        icon_img.save(os.path.join(sprites_dir, 'rem_tray.ico'), format='ICO')
        print(f"Saved {os.path.join(sprites_dir, 'rem_tray.ico')}")
        
        # Create breathing frames
        create_breathing_frames(idle_img, os.path.join(sprites_dir, 'rem_idle'))
        
        # Create walking frames
        create_walking_frames(idle_img, sprites_dir)
        
    if float_img:
        create_floating_frames(float_img, sprites_dir)

if __name__ == "__main__":
    main()
