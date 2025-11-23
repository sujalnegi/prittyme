# app.py
import os
import io
import base64
from flask import Flask, render_template, request, jsonify, send_file, abort
from PIL import Image

app = Flask(__name__)

DEMO_LOCAL_PATH = "/mnt/data/2102bf65-4be1-40b1-bc80-66403376563c.png"

try:
    from rembg import remove as rembg_remove
    HAVE_REMBG = True
except Exception:
    HAVE_REMBG = False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/compress')
def compress():
    return render_template('compress.html')

@app.route('/bg-remove')
def bg_remove_page():
    return render_template('bg-remove.html')

@app.route('/about')
def about():
    return render_template('about.html')

def _bytes_to_response(bts: bytes, mimetype: str):
    buf = io.BytesIO(bts)
    buf.seek(0)
    return send_file(buf, mimetype=mimetype)

def load_image_bytes_from_path(path: str):
    if not os.path.isabs(path):
        raise FileNotFoundError("path must be absolute")
    if not os.path.exists(path):
        raise FileNotFoundError(f"File not found: {path}")
    with open(path, "rb") as f:
        return f.read()

@app.route('/api/remove-bg', methods=['POST'])
def api_remove_bg():

    out_mime = request.form.get('output') or 'image/png'
    keep_alpha_flag = request.form.get('keep_alpha')
    if keep_alpha_flag is None:
        keep_alpha_flag = True
    else:
        keep_alpha_flag = str(keep_alpha_flag) in ('1', 'true', 'True')

    input_bytes = None
    input_mime = 'image/png'

    if 'image' in request.files and request.files['image'].filename:
        f = request.files['image']
        input_bytes = f.read()
        input_mime = f.mimetype or 'image/png'

    elif 'image_url' in request.form and request.form['image_url']:
        path = request.form['image_url']
        try:
            input_bytes = load_image_bytes_from_path(path)
            try:
                with Image.open(io.BytesIO(input_bytes)) as im:
                    input_mime = Image.MIME.get(im.format, 'image/png')
            except Exception:
                input_mime = 'image/png'
        except FileNotFoundError as e:
            return jsonify({"error": str(e)}), 404

    else:
        if os.path.exists(DEMO_LOCAL_PATH):
            input_bytes = load_image_bytes_from_path(DEMO_LOCAL_PATH)
            input_mime = 'image/png'
        else:
            return jsonify({"error": "No image provided and demo image not found on server."}), 400

    try:
        if HAVE_REMBG:
            result_bytes = rembg_remove(input_bytes)
        else:
            result_bytes = input_bytes

        if out_mime == 'image/jpeg' or (out_mime == 'image/png' and not keep_alpha_flag):
            try:
                with Image.open(io.BytesIO(result_bytes)).convert("RGBA") as rgba_im:
                    bg = Image.new("RGB", rgba_im.size, (255, 255, 255))
                    bg.paste(rgba_im, mask=rgba_im.split()[3])
                    out_buf = io.BytesIO()
                    bg.save(out_buf, format='JPEG', quality=92)
                    return _bytes_to_response(out_buf.getvalue(), mimetype='image/jpeg')
            except Exception:
                return _bytes_to_response(result_bytes, mimetype=input_mime)
        else:
            return _bytes_to_response(result_bytes, mimetype='image/png')

    except Exception as ex:
        app.logger.exception("Background removal failed")
        try:
            return _bytes_to_response(input_bytes, mimetype=input_mime)
        except Exception:
            return jsonify({"error": f"Processing failed: {ex}"}), 500

@app.route('/resize', endpoint='resize')
def compress():
    return render_template('resize.html')

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)



                                    
