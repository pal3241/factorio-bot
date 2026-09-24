from datetime import datetime

project = "FactoBot"
author = "pal3241"
copyright = f"{datetime.now().year}, pal3241"
version = "0.5"
release = "0.5.0"

extensions = [
    "myst_parser",
    "sphinx_copybutton",
]

source_suffix = {
    ".rst": "restructuredtext",
    ".md": "markdown",
}

master_doc = "index"
language = "en"

exclude_patterns = ["_build", "README.md", "Thumbs.db", ".DS_Store"]

myst_enable_extensions = ["colon_fence", "deflist", "tasklist"]

html_theme = "sphinx_rtd_theme"
html_title = "FactoBot 0.5.0 documentation"
html_theme_options = {
    "collapse_navigation": False,
    "sticky_navigation": True,
    "navigation_depth": 4,
    "includehidden": True,
    "titles_only": False,
}

html_static_path = ["_static"]
html_css_files = ["custom.css"]

html_context = {
    "display_github": True,
    "github_user": "pal3241",
    "github_repo": "factorio-bot",
    "github_version": "main",
    "conf_py_path": "/docs/",
}

copybutton_prompt_text = r">>> |\.\.\. |\$ |PS> "
copybutton_prompt_is_regexp = True
