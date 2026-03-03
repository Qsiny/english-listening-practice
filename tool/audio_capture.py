import argparse
import os
import re
import subprocess
from typing import Optional


_TIME_RE = re.compile(r"^\s*(\d+):([0-5]?\d):([0-5]?\d(?:\.\d+)?)\s*$")


def parse_time_to_seconds(t: str) -> float:
    """
    支持两种格式：
    - 秒数： "12" / "12.5"
    - 时分秒： "HH:MM:SS" / "HH:MM:SS.sss"
    """
    t = t.strip()
    m = _TIME_RE.match(t)
    if m:
        hh = int(m.group(1))
        mm = int(m.group(2))
        ss = float(m.group(3))
        return hh * 3600 + mm * 60 + ss
    # 走秒数
    return float(t)


def seconds_to_ffmpeg_time(seconds: float) -> str:
    # ffmpeg 接受纯秒数，但这里统一输出带小数的秒串
    return f"{seconds:.3f}".rstrip("0").rstrip(".")


def ensure_ffmpeg_exists() -> None:
    try:
        subprocess.run(
            ["ffmpeg", "-version"], check=True, capture_output=True, text=True
        )
    except FileNotFoundError:
        raise RuntimeError("未找到 ffmpeg：请先在 macOS 上执行 `brew install ffmpeg`")
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"ffmpeg 不可用：{e.stderr or e.stdout}")


def build_default_out_path(input_path: str, start_s: float, end_s: float) -> str:
    base = os.path.splitext(os.path.basename(input_path))[0]
    return os.path.join(
        os.path.dirname(input_path),
        f"{base}_{seconds_to_ffmpeg_time(start_s)}-{seconds_to_ffmpeg_time(end_s)}.mp3",
    )


def extract_mp3(
    input_path: str,
    start: str,
    end: str,
    out_path: Optional[str] = None,
    bitrate: str = "192k",
) -> str:
    ensure_ffmpeg_exists()

    if not os.path.isfile(input_path):
        raise FileNotFoundError(f"输入文件不存在：{input_path}")

    start_s = parse_time_to_seconds(start)
    end_s = parse_time_to_seconds(end)

    if start_s < 0:
        raise ValueError("start 不能小于 0")
    if end_s <= start_s:
        raise ValueError("end 必须大于 start")

    if out_path is None:
        out_path = build_default_out_path(input_path, start_s, end_s)

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)

    # 说明：
    # -ss 放在 -i 之后：更精确（对音频截取更稳），代价是慢一点，但对小工具更友好
    # -to 表示相对起点的结束位置（配合 -ss 使用）
    # -vn 禁用视频
    # -acodec libmp3lame 输出 mp3
    # -b:a 设置码率
    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-y",
        "-i",
        input_path,
        "-ss",
        seconds_to_ffmpeg_time(start_s),
        "-to",
        seconds_to_ffmpeg_time(end_s),
        "-vn",
        "-acodec",
        "libmp3lame",
        "-b:a",
        bitrate,
        out_path,
    ]

    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"ffmpeg 失败：\n{p.stderr}")

    return out_path


def main():
    parser = argparse.ArgumentParser(description="从 MP4 提取指定时间段音频并输出 MP3")
    parser.add_argument("input", help="输入 mp4 文件路径")
    parser.add_argument(
        "--start", required=True, help='开始时间（秒 or "HH:MM:SS[.ms]"）'
    )
    parser.add_argument(
        "--end", required=True, help='结束时间（秒 or "HH:MM:SS[.ms]"）'
    )
    parser.add_argument("--out", default=None, help="输出 mp3 路径（可选）")
    parser.add_argument(
        "--bitrate", default="192k", help='mp3 码率，如 "128k" "192k" "320k"'
    )
    args = parser.parse_args()

    out = extract_mp3(args.input, args.start, args.end, args.out, args.bitrate)
    print(out)


if __name__ == "__main__":
    main()
