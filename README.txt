# CamLib - JavaScript Image Compression Library

CamLib is a lightweight JavaScript library designed for image compression using the CamLib API. It streamlines the process of compressing PNG and JPEG images, reducing file sizes without compromising quality.

## Installation

Before using CamLib, make sure you have the required modules installed. You can install them using npm:

```bash
npm install fs request minimatch glob array-uniq chalk prettysize md5-file
```

## Usage

To use CamLib, execute the following command in your terminal:

```bash
node CamLib.js <path>
```

Replace `<path>` with the path to the image or directory containing images you want to compress.

### Options

- `-k, --key`: Provide an API key (get one at [CamLib Developers](https://CamLib.com/developers)).
- `-r, --recursive`: Walk the given directory recursively.
- `--width`: Resize an image to a specified width.
- `--height`: Resize an image to a specified height.
- `--force`: Ignore caching to prevent repeat API requests.
- `--dry-run`: Dry run — no files actually modified.
- `-c, --cache`: Cache map location (defaults to `~/.CamLib.cache.json`).
- `-m, --max`: Maximum concurrent operations (defaults to -1 for no max).
- `-v, --version`: Show installed version.
- `-h, --help`: Show help.

## Example

```bash
node CamLib.js assets/img
```

This command compresses all PNG and JPEG images in the `assets/img` directory.

## Contributing

Feel free to contribute to CamLib by submitting bug reports or pull requests on the(https://github.com/TaYEBWA18/2020bse063_CamLib.git).
