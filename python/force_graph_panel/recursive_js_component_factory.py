import pathlib
import re
from typing import List, Set, Type

from loguru import logger

from .multi_file_js_component_factory import ClassType, MultiFileJsComponentFactory

# Regular expression to match relative imports in JavaScript
IMPORT_PATTERN = re.compile(r'import\s+.*?\s+from\s+["\'](\.\/.*?)["\'];')


def recursive_component_search(
    initial_file: pathlib.Path, base_class: Type[ClassType]
) -> MultiFileJsComponentFactory:
    """
    Recursively searches for relative imports in JavaScript files, creating the appropriate
    component factory instance with collected files.

    Args:
        initial_file (pathlib.Path): Path to the initial JavaScript file.
        base_class (Type[ClassType]): The base class to wrap.

    Returns:
        Type[ClassType]: A new class extending `base_class`, with concatenated JavaScript.
    """

    def find_relative_imports(
        file_path: pathlib.Path, visited_files: Set[pathlib.Path]
    ) -> List[pathlib.Path]:

        logger.debug(f"Processing file: {file_path}")
        if file_path in visited_files:
            return []  # Avoid re-processing files

        visited_files.add(file_path)
        imported_files = []

        # Read file content
        file_content = file_path.read_text()

        # Search for relative imports
        for match in IMPORT_PATTERN.findall(file_content):
            logger.debug(f"Found import: {match}")

            if not match.endswith(".js"):
                match += ".js"

            relative_path = file_path.parent / match
            logger.debug(f"Resolved path: {relative_path}")
            if relative_path.is_file() and relative_path not in visited_files:
                imported_files.append(relative_path)
                # Recursive search for imports within the imported file
                imported_files.extend(
                    find_relative_imports(relative_path, visited_files)
                )

        return imported_files

    # Start recursive search from the initial file
    visited_files: set[pathlib.Path] = set()
    filepaths = [initial_file] + find_relative_imports(initial_file, visited_files)

    # Create the MultiFileJsComponentFactory with the collected files
    return MultiFileJsComponentFactory(base_class=base_class, filepaths=filepaths)
