# Security

This plugin runs locally with the permissions of Obsidian. It has no runtime accounts, telemetry or network service. Input parsers, SVG generation and guarded note writes still need careful review; offline operation does not eliminate software defects.

Only the latest public beta release is actively maintained. This is an early desktop MVP, without a guaranteed response time or an independent security audit.

## Reporting a vulnerability

When this repository is published, use its **Security → Report a vulnerability** option if private vulnerability reporting is enabled. Do not post private notes, vault archives, credentials or a working exploit against somebody else's data in a public issue. If private reporting is unavailable, open an issue asking the maintainer to enable it, without exploit details.

Include the plugin and Obsidian versions, operating system, an invented minimal input, expected/actual behavior and the affected boundary (for example unexpected file modification, unbounded input processing or unsafe rendering).

For an ordinary display or usability defect, use the bug report template instead. For suspected note corruption, preserve a copy of the affected note before further testing and reproduce in a disposable vault.
