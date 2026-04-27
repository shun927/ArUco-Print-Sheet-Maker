import json
from pathlib import Path

import cv2


DICTIONARIES = [
    ("DICT_4X4_50", "ArUco 4x4 (50)"),
    ("DICT_4X4_100", "ArUco 4x4 (100)"),
    ("DICT_4X4_250", "ArUco 4x4 (250)"),
    ("DICT_4X4_1000", "ArUco 4x4 (1000)"),
    ("DICT_5X5_50", "ArUco 5x5 (50)"),
    ("DICT_5X5_100", "ArUco 5x5 (100)"),
    ("DICT_5X5_250", "ArUco 5x5 (250)"),
    ("DICT_5X5_1000", "ArUco 5x5 (1000)"),
    ("DICT_6X6_50", "ArUco 6x6 (50)"),
    ("DICT_6X6_100", "ArUco 6x6 (100)"),
    ("DICT_6X6_250", "ArUco 6x6 (250)"),
    ("DICT_6X6_1000", "ArUco 6x6 (1000)"),
    ("DICT_7X7_50", "ArUco 7x7 (50)"),
    ("DICT_7X7_100", "ArUco 7x7 (100)"),
    ("DICT_7X7_250", "ArUco 7x7 (250)"),
    ("DICT_7X7_1000", "ArUco 7x7 (1000)"),
    ("DICT_ARUCO_ORIGINAL", "Original ArUco"),
    ("DICT_ARUCO_MIP_36H12", "MIP 36h12 (250)"),
    ("DICT_APRILTAG_16H5", "AprilTag 16h5 (30)"),
    ("DICT_APRILTAG_25H9", "AprilTag 25h9 (35)"),
    ("DICT_APRILTAG_36H10", "AprilTag 36h10 (2320)"),
    ("DICT_APRILTAG_36H11", "AprilTag 36h11 (587)"),
]


def marker_bits(dictionary, marker_id, marker_size):
    total_cells = marker_size + 2
    cell_pixels = 8
    image = cv2.aruco.generateImageMarker(
        dictionary, marker_id, total_cells * cell_pixels, borderBits=1
    )
    bits = []
    for y in range(total_cells):
        for x in range(total_cells):
            sample = image[y * cell_pixels + cell_pixels // 2, x * cell_pixels + cell_pixels // 2]
            bits.append("1" if sample < 128 else "0")
    return "".join(bits)


def main():
    payload = {}
    for const_name, label in DICTIONARIES:
        dictionary = cv2.aruco.getPredefinedDictionary(getattr(cv2.aruco, const_name))
        count = int(dictionary.bytesList.shape[0])
        marker_size = int(dictionary.markerSize)
        payload[const_name] = {
            "label": label,
            "markerSize": marker_size,
            "count": count,
            "markers": [marker_bits(dictionary, marker_id, marker_size) for marker_id in range(count)],
        }

    out = Path(__file__).resolve().parents[1] / "markers-data.js"
    out.write_text(
        "window.ARUCO_MARKER_DATA = "
        + json.dumps(payload, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
