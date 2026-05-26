#!/usr/bin/env python3
"""Синхронизирует канонический backend/_shared/shared.py во все папки backend/*/.

Использование:
    python3 backend/_shared/sync_shared.py
    python3 backend/_shared/sync_shared.py --check    # только проверить расхождения, не писать

Логика:
- Канон лежит в backend/_shared/shared.py.
- Каждая папка backend/<func>/ должна получить ИДЕНТИЧНУЮ копию shared.py.
- Локальные расширения остаются рядом в *_utils.py (например, landing_utils.py).
- Запускайте скрипт после каждого изменения канона перед `sync_backend`.
"""
from __future__ import annotations

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
CANON_PATH = BACKEND_DIR / '_shared' / 'shared.py'

# Папки, в которые НЕ копируем канон:
#  - _shared: сам канон
#  - extensions/*: маркетплейсные расширения с собственной логикой
EXCLUDE = {'_shared', 'extensions'}


def find_targets() -> list[Path]:
    targets: list[Path] = []
    for child in sorted(BACKEND_DIR.iterdir()):
        if not child.is_dir():
            continue
        if child.name in EXCLUDE or child.name.startswith('.'):
            continue
        # Считаем папкой Cloud Function, если в ней есть index.py или index.ts
        if (child / 'index.py').exists() or (child / 'index.ts').exists():
            targets.append(child / 'shared.py')
    return targets


def main() -> int:
    check_only = '--check' in sys.argv

    if not CANON_PATH.exists():
        print(f'❌ Канон не найден: {CANON_PATH}')
        return 1

    canon = CANON_PATH.read_bytes()
    targets = find_targets()

    if not targets:
        print('⚠️  Не найдено ни одной целевой папки.')
        return 0

    changed: list[Path] = []
    created: list[Path] = []
    for dst in targets:
        if not dst.exists():
            created.append(dst)
            if not check_only:
                dst.write_bytes(canon)
            continue
        if dst.read_bytes() != canon:
            changed.append(dst)
            if not check_only:
                dst.write_bytes(canon)

    print(f'Канон: {CANON_PATH.relative_to(BACKEND_DIR.parent)}')
    print(f'Целей: {len(targets)}')
    print(f'Изменено: {len(changed)}')
    print(f'Создано: {len(created)}')

    for p in created:
        print(f'  + {p.relative_to(BACKEND_DIR.parent)}')
    for p in changed:
        print(f'  ~ {p.relative_to(BACKEND_DIR.parent)}')

    if check_only and (changed or created):
        print('\n⚠️  Есть расхождения. Запустите без --check, чтобы синхронизировать.')
        return 2

    if not changed and not created:
        print('\n✅ Всё уже синхронизировано.')

    return 0


if __name__ == '__main__':
    sys.exit(main())
