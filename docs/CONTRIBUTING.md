# Contributing to SystematicaHub

Thank you for your interest! Contributions are welcome from researchers, developers, and anyone passionate about open evidence synthesis tools.

## How to contribute

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes in `index.html`
4. Test locally by opening `index.html` in a browser
5. Submit a pull request with a clear description

## Priority areas

- AMSTAR-2 and ROBIS quality appraisal tools
- Forest plot and funnel plot visualisation
- Zotero / Mendeley RIS import
- RevMan 5 XML export
- GRADE Summary of Findings table
- Additional HEOR database search formats (DARE, NHS EED, HTA)
- Mobile-responsive improvements
- Accessibility (WCAG 2.1 AA compliance)

## Code style

- All UI is in a single `index.html` (React via CDN, no build step)
- Use CSS variables defined in `:root` for all colours
- Keep components as pure React functions
- Comment all new sections clearly

## Reporting bugs

Open a GitHub Issue with:
- Steps to reproduce
- Browser and OS
- Screenshot if applicable
- Any console error messages
