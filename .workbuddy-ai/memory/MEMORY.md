# Promtova — соглашения проекта

## О проекте
Локальная SPA «IDE для промпт-инжиниринга» (React 19 + TS strict + Vite 7 + Tailwind v4
+ Zustand 5 + lucide-react). Собирается в один `dist/index.html` через vite-plugin-singlefile.
Все тексты интерфейса — **на русском**.

## Команды
```bash
npm run dev | build | preview
npm run typecheck   # tsc --noEmit (strict, noUnusedLocals/Params — включают неиспользуемые импорты)
npm run lint        # ESLint flat config (eslint.config.js)
npm test            # Vitest, 93 теста
```

## Архитектурные правила (не нарушать)
1. **Чтение текста промпта — только через `getPromptText(p)`** (utils/promtova.ts).
   Он возвращает `content` в обычном режиме и склейку system/context/output в шаблонном.
   Напрямую `p.content` читать нельзя — иначе шаблонный режим работает неверно.
2. **`Folder.parent/children` хранят id**, не названия. `children` пересобирается из
   `parent` в `normalizeFolders()`. Поэтому переименование папки не требует каскада.
3. **Все папки извне проходят через `normalizeFolders()`** — это гарантирует id,
   уникальные `order` и консистентность связей (миграция + импорт).
4. **Хоткеи — только в `src/hooks/useGlobalHotkeys.ts`.** `Modal` не вешает свой Esc.
   Список в `ShortcutsModal` обязан совпадать с реализацией.
5. **Стили — CSS-переменные токены** (`--bg-panel`, `--accent-primary`, `--shadow-*`)
   и утилита `cn()`. Цвета и отступы не хардкодить.
6. **Новые интерактивные элементы** получают `aria-label` / `role` / `aria-pressed`.

## Данные
- `localStorage`: `promtova-state` (промпты, папки, настройки), `promtova-theme` (темы).
- Схема версионируется (`version: 2`); миграция в сторе обязана сохранять старые данные
  без сброса (числовые id → строки, названия папок → id).
- Теги — производные, пересчитываются (`recomputeTags`), отдельно не хранятся.

## Тесты
- Фикстуры: `prompt()` / `folder()` хелперы в самих тестах; сброс стора через
  `usePromtovaStore.setState(...)` в `beforeEach`.
- В компонентах подписывайтесь на **примитив**, не на объект стора, чтобы эффекты
  не сбрасывали форму при каждом изменении состояния.

## Процесс
- Проект под git; коммиты — обычные `git commit` (владелец: Павел К. / Neurocode).
- После изменения кода — `graphify update` (граф знаний в `.graphify/`, правила в `AGENTS.md`).
