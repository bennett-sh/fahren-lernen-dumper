# Fahren Lernen Dumper

Fahren Lernen Dumper is a command-line tool that downloads all available questions, translations, and media from the Fahren Lernen mobile app API.

## Prerequisites

- [Bun](https://bun.sh/) must be installed.
- A valid Fahren Lernen account.

## Installation

Clone the repository and install dependencies:

```sh
git clone <repository-url>
cd fahren-lernen-dumper
bun install
```

## Usage

Run the tool using Bun:

```sh
bun . -- --email <your-email> --password <your-password> [--quality <high/low/both>] [--directory <./dump>] [--media-types <image/video/both>]
```

### Options

- `--email`: Your Fahren Lernen account email.
- `--password`: Your Fahren Lernen account password.
- `--quality`: Filter media by quality (`high`, `low`, or `both`; default is `both`).
- `--media-types`: Filter media by type (`image`, `video`, or `both`; default is `both`).
- `--directory`: The output directory (default is `./dump`).

## Output

After execution, the specified directory will include:

- `questions.json`: Contains the general question structure.
- `questionTexts-[lang].json`: Contains texts for each question (generated for all available languages).
- `media/`: A folder with `high/` and `low/` subdirectories containing the downloaded media.

## License

[MIT License](LICENSE)
