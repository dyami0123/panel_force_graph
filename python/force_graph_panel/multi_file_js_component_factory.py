import pathlib
from typing import Generic, Type, TypeVar

from loguru import logger

ClassType = TypeVar("ClassType")


class MultiFileJsComponentFactory(Generic[ClassType]):

    base_class: Type[ClassType]
    filepaths: list[pathlib.Path]

    def __init__(self, base_class: Type[ClassType], filepaths: list[pathlib.Path]):
        self.base_class = base_class
        self.filepaths = filepaths

    def __call__(self) -> ClassType:
        return self.generate_class()()

    def generate_class(self) -> Type[ClassType]:

        class newClass(self.base_class):  # type: ignore
            _esm = self._generate_concats()

        return newClass

    def _generate_concats(self):
        concat_str = "\n".join(file.read_text() for file in self.filepaths)
        return self._remove_local_import(concat_str)

    @property
    def _filenames(self) -> list[str]:
        return [file.name for file in self.filepaths]

    def _remove_local_import(self, file: str) -> str:
        new_str_elements = []
        for line in file.split("\n"):
            if "import" in line:
                if any(filename in line for filename in self._filenames):
                    logger.debug(f"Removing line: {line} due to local import")
                    pass
                else:
                    new_str_elements.append(line)
            else:
                new_str_elements.append(line)

        return "\n".join(new_str_elements)
