# ТЗ — Доработка v3: Windows-десктоп-версия «Промтовой»

**Статус:** Черновик (составлен на основе аудита реализации v1.1.0)
**База:** `vite.config.ts` (single-file), `src/store/usePromtovaStore.ts` (2 Zustand-стора с persist → localStorage), `package.json` v1.1.0.
**Цель этапа:** Перенести веб-приложение в нативное Windows-приложение с установщиком `setup.exe` и **полностью нативным хранилищем** (данные — в файловой системе ПК, **без** `localStorage`, IndexedDB, Cookie и прочих web-хранилищ).

---

## 0. Фиксируем исходное состояние (после v1.1.0)

Проверено на текущей ветке (git clean, build OK):

| Факт | Значение |
|---|---|
| Сборка | `vite build` → **single-file** `dist/index.html` (366 kB, gzip 111 kB). Плагин `vite-plugin-singlefile`. |
| Точка входа | `src/main.tsx` → `createRoot(...).render(<App/>)` |
| Хранилище сейчас | 2 Zustand-стора с `persist` → `localStorage`: `promtova-state` (v2, с migrate) и `promtova-theme` |
| Версия данных | `EXPORT_VERSION = '1.1'` (`src/utils/importExport.ts`) |
| Данные (состояние) | `prompts`, `folders`, `selectedFolderId`, `editorMode`, `sortBy`, `autosave`, `editorFontSize` + темы `currentTheme`/`customThemes` |
| Настройки в Settings | «Расположение данных: localStorage (ключи promtova-state / promtova-theme)» — **будет заменено** |
| Тесты | 93 зелёных (`vitest`, jsdom) |
| Проверки | `tsc --noEmit` exit 0; `eslint .` exit 0 |
| Прямых обращений к `localStorage` вне собственно storage-адаптеров | Только в `src/store/usePromtovaStore.ts` (2 места) + тест `src/test/setup.ts` |

---

## 1. Целевая архитектура решения

### 1.1 Стек
- **React 19 + Vite 7 + TypeScript strict** — как сейчас (UI полностью переиспользуется).
- **Electron 33+** — оболочка нативного приложения (main / preload / renderer, `contextIsolation: true`).
- **electron-builder** — генерация установщика **NSIS `setup.exe`**.
- **electron-store** — нативное хранилище в JSON-файле на диске (готовый, проверенный слой; собственную реализацию `fs` писать **не** будем).

> ⚠️ Критически важно: **UI-слой не трогаем** (компоненты, стор-логика, хоткеи, темы, импорт/экспорт остаются без изменений). Меняем **только слой персистентности** и **сборку**.

### 1.2 Три процесса Electron
```
main  (electron/main.js)        → окно + IPC-мост + electron-store (единственное место с доступом к диску)
preload (electron/preload.js)   → contextBridge: expose API «stores» в renderer (только whitelist методов)
renderer (весь существующий src/) → React; хранилище ходит ТОЛЬКО через preload API
```

### 1.3 Принцип «нативного хранилища»
- Все данные приложения живут в одном JSON-файле в каталоге пользователя:
  - **Путь:** `%APPDATA%\Promtova\stores.json` (создаётся через `new Store({ name: 'stores' })`)
  - (на Windows `%APPDATA%` = `C:\Users\<user>\AppData\Roaming`)
- Файл создаётся и читается в main-процессе через **electron-store** (правильный каталог данных Electron берёт сам: `%APPDATA%\Promtova\`), данные приходят в renderer через IPC-мост.
- electron-store сохраняет каждый ключ в `.json`; запись — атомарная (пишет во временный файл и переименовывает), так что отдельный велосипед с `fsync`/rename не нужен.
- **Запрещены** в renderer в любой форме: `localStorage`, `sessionStorage`, `indexedDB`, `cookies`, `Cache API`. Доступ к диску — только через main-процесс (безопасность, `sandbox`). Единственное допустимое касание web-хранилищ — **разовая утилита переноса** данных старой веб-версии (§11.2, вариант 2 — только по согласованию).

---

## 2. Реализация нативного хранилища (ключевая часть ТЗ)

### 2.1 Новый storage-адаптер для Zustand
Существующие два стора используют `createJSONStorage(() => localStorage)`. Заменяем на штатный интерфейс Zustand `StateStorage` поверх IPC:

```ts
// src/storage/nativeStorage.ts
type StorageApi = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};
```
- `createJSONStorage(async () => nativeStorage)` — Zustand 5 поддерживает async-хранилища; hydration станет асинхронной (см. §2.4).
- Адаптер-мост: `nativeStorage` вызывает `window.promtova.stores.get(key)` / `set(key, value)` / `remove(key)` — методы, предоставленные preload через `contextBridge`.
- В **тестовой/веб-среде** (vitest, `vite dev` без Electron) адаптер прозрачно фолбэчится в in-memory-map, чтобы UI и тесты работали как прежде (см. §4). Это **не** localStorage — чистый JS-объект в памяти.

### 2.2 Формат файла на диске (electron-store)
electron-store хранит один JSON в каталоге данных приложения. Ключи соответствуют именам Zustand-сторов:
```
%APPDATA%\Promtova\config.json   // по умолчанию; возможно задать кастомное имя через new Store({ name: 'stores' })
{
  "promtova-state": { "state": { ... }, "version": 2 },
  "promtova-theme": { "state": { ... } }
}
```
- Инициализация в main-процессе:
```js
const Store = require('electron-store');
const store = new Store({ name: 'stores' });   // -> %APPDATA%\Promtova\stores.json
```
- В renderer каждый ключ (`promtova-state`, `promtova-theme`) ведёт себя как отдельное значение — стандартная структура Zustand persist (`{ state, version }`), поэтому **`migrate`/`partialize` продолжают работать без изменений**.
- Атомарная запись, ленивая загрузка файла и кэш — уже встроены в electron-store (сам пишет во временный файл и переименовывает). Повреждённый JSON electron-store при чтении вернёт `undefined` для ключа → обработать как отсутствие данных (=> seed/миграция).
- Доступ к диску — только в main-процессе; renderer получает значения через IPC и ни при каких условиях не читает файл напрямую.

### 2.3 IPC-контракт (main ↔ renderer)
`preload` экспонирует минимальный API-объект (whitelist, без прямого `fs`-доступа к renderer):

```ts
window.promtova = {
  stores: {
    get(key: 'promtova-state' | 'promtova-theme'): Promise<string | null>,   // raw JSON string
    set(key, value: string): Promise<void>,
    remove(key): Promise<void>,
  },
  file: {                                   // для экспорта/импорта файлов (§6)
    showOpenDialog(opts), showSaveDialog(opts),
    readText(path), writeText(path, content),
  }
};
```
- `ipcMain.handle('stores:get'|'stores:set'|'stores:remove', ...)` в отдельном модуле `electron/storeService.js`.

### 2.4 Асинхронная гидрация стора (важно)
`persist` из Zustand при async-хранилище гидратируется асинхронно. Требование:
- До завершения гидрации показывать **лёгкий splash/загрузку** (или задержку рендера App), чтобы не проскочил «пустой» seed поверх готовых данных.
- Использовать `useStore.persist.onFinishHydration` или флаг `hasHydrated`; пока не готов — `null`/загрузочный экран.
- Тест: гидрация из предзаполненного файла → данные восстанавливаются, seed **не** перезатирает их.

---

## 3. Electron-обвязка

### 3.1 Структура папок
```
electron/
  main.js            // создаёт BrowserWindow, регистрирует IPC, single-instance, autoUpdater
  preload.js         // contextBridge
  storeService.js    // обёртка над electron-store: чтение/запись/удаление ключей (через IPC)
  fileService.js     // диалоги + чтение/запись файлов импорта/экспорта
  updater.js         // electron-updater: проверка/загрузка/установка обновлений (см. §3.4)
```
`package.json` → поле `"main": "electron/main.js"` (для запуска под Electron). Vite-сборка renderer по-прежнему в `dist/` (single-file).

### 3.2 BrowserWindow
```js
new BrowserWindow({
  width: 1280, height: 800, minWidth: 940, minHeight: 640,
  title: 'Промтовая',
  autoHideMenuBar: true,
  backgroundColor: '#0B0D10',
  webPreferences: {
    contextIsolation: true,           // обязательно
    sandbox: true,
    preload: path.join(__dirname, 'preload.js'),
  },
});
```
- В dev загружаем `http://localhost:5173` (vite dev), в prod — `file://.../dist/index.html`.
- **single-instance lock** (`app.requestSingleInstanceLock()`): повторный запуск фокусирует существующее окно.
- Управление меню: убрать/скрыть devtools-меню в проде, но оставить `F12`/`Ctrl+Shift+I` в dev.

### 3.3 CSP и безопасность
- `meta` `Content-Security-Policy` в `index.html` (или через `session.defaultSession.webRequest.onHeadersReceived`): запретить подключение сторонних origin; `default-src 'self'`.
- `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false` — **никакого Node/RESTRICT в renderer**.
- Запрещена загрузка из внешних доменов для renderer — единственный сетевой канал приложения — **обновления** (см. §3.4).

### 3.4 Автообновление (electron-updater)
Подключаем **electron-updater** (NSIS-таргет поддерживает его нативно через `nsis`):
- Официальный канал релизов — GitHub Releases (или приватный URL; зафиксировать на старте).
- Поток работы:
  1. При старте и затем каждые N часов (напр. 4 ч) — `autoUpdater.checkForUpdates()`.
  2. Найдено обновление → тихий `downloadUpdate()`, по готовности — уведомление пользователю: «Доступна новая версия. Перезапустить сейчас / позже».
  3. Подтверждение → `quitAndInstall()`.
- Прогресс загрузки отображать в UI (IPC-события `checking`/`update-available`/`download-progress`/`update-downloaded`/`error`), например тостом или лёгким баннером в шапке.
- Настройки:
  - `publish` в конфиге electron-builder (см. §7.1) с `provider: github` и `owner/repo`.
  - `autoUpdater.autoDownload = true`, `autoInstallOnAppQuit = true` (по умолчанию; можно поменять на подтверждение).
- **Верификация:** упакованный `setup.exe` проверяет `latest.yml` на канале; запуск `dev`/неподписанной сборки обновлениями не занимается (electron-updater требует упакованное приложение).
- Ошибки обновления (нет сети/канала) — молча логируются, приложение работает как обычно (редактирование и локальное хранилище не блокируются).

---

## 4. Совместимость с разработкой и тестами

### 4.1 Веб/тестовая среда
- `nativeStorage` при отсутствии `window.promtova` (vitest/jsdom, `npm run dev` в браузере) использует **in-memory** адаптер (Map). Никакого `localStorage` в коде не остаётся вообще.
- `src/test/setup.ts` (там `localStorage.clear()`) → заменить на сброс in-memory-адаптера/лоадера стора.
- Все 93 существующих теста + новые (см. §5) должны оставаться зелёными в jsdom.

### 4.2 Эмуляция Electron в браузере
- В dev браузерный режим работает через in-memory (данные в рамках сессии) — как «демо».
- Полноценное персистентное хранилище доступно только в собранном Electron-приложении (данные — файл на диске).

---

## 5. Тестирование нового слоя

Добавить тесты (vitest, jsdom + юнит на storeService с моком инстанса electron-store):
1. `nativeStorage`-адаптер: `get/set/remove` маппятся в `window.promtova.stores`.
2. Фолбэк in-memory без `window.promtova`.
3. Zustand-стор с async-хранилищем: гидрация из предзаполненного объекта; `migrate`/`partialize` прежние.
4. storeService (обёртка над electron-store, мок инстанса): get/set/remove по ключам, отсутствующий/повреждённый ключ → `null`, версия (`{state, version}`) сохраняется.
5. E2E-смоук (опционально, Playwright для Electron): открыть приложение, создать промпт, перезапустить → данные на месте.
6. Автообновление: юнит-тест на IPC-обработчики событий `checking`/`update-downloaded`/`error` (мок electron-updater).
7. Запускать: `npm run typecheck`, `npm test`, `npm run lint` — exit 0.

---

## 6. Экспорт/импорт файлов (адаптация §5 исходного ТЗ)

Сейчас в вебе экспорт делает download-файл, импорт — `<input type=file>`:
- **Экспорт:** в Electron вместо download — `dialog.showSaveDialog` + `writeText` в выбранный путь (`.prmt`/`.json`/`.md`/`.txt`). Формат данных и функции `buildExportData`/`parseImportFile` — **без изменений**.
- **Импорт:** `dialog.showOpenDialog` + `readText`, далее прежний `parseImportFile` + `applyMerge`/MergeModal.
- Существующий слой `copyToClipboard` (`src/utils/copy.ts`) — перевести на `navigator.clipboard` (в Electron с надлежащим фокусом работает; при необходимости — IPC `clipboard.writeText`).
- Экспорт/импорт в **веб-режиме** (без Electron) оставить на прежних download/input — чтобы UI не ломался.

---

## 7. Установщик setup.exe (electron-builder)

### 7.1 Конфиг (в `package.json` → `build` или `electron-builder.yml`)
```yaml
appId: com.neurocode.promtova
productName: Промтовая
directories:
  output: release
files:
  - dist/**
  - electron/**
  - package.json
extraMetadata:
  main: electron/main.js
win:
  target:
    - target: nsis
      arch: [x64]
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: Промтовая
  uninstallDisplayName: Промтовая
  artifactName: "${productName}-Setup-${version}.exe"
publish:
  provider: github
  owner: <owner>
  repo: <repo>
  releaseType: release
```
- `publish` подключает **автообновление** через GitHub Releases (см. §3.4); при сборке помимо `setup.exe` генерирует `latest.yml` — манифест для electron-updater.
- `<owner>/<repo>` — фактический GitHub-репозиторий проекта; указать при реализации.
- **Результат:** `release/Промтовая-Setup-1.2.0.exe`.
- Также доступны portable (`-portable.exe`) опционально, а также `zip`/`dir` для отладки.
- Иконка приложения: сгенерировать `build/icon.ico` (если нет — поставить заглушку, отдельной задачей).
- Code-signing: не входит в скоуп (нет сертификата); поле `publisherName` заполнить данными автора (Pavel K. / Neurocode).

### 7.2 Скрипты npm
```json
"electron": "electron .",
"electron:dev": "vite & electron .",            // запуск dev + electron
"desktop:build": "npm run build && electron-builder --win nsis",
"desktop:dir":   "npm run build && electron-builder --win dir"   // отладка без установки
```

### 7.3 Верификация результата
- Установка `setup.exe` на чистой Windows (x64, без node_modules в системе) → приложение запускается.
- Файл данных создаётся в `%APPDATA%\Promtova\stores.json` при первом запуске; **в папке установщика НЕ создаётся** никаких файлов данных (полностью нативное хранилище пользователя, уважается `Program Files` read-only).
- Удаление через «Установка и удаление программ» / uninstaller не задевает `%APPDATA%\Promtova` (данные пользователя остаются, как и положено).

---

## 8. Изменения в UI (минимальные, только правда про «где данные»)

- `src/components/modals/SettingsModal.tsx` (§ «Данные»):
  - «Расположение данных: localStorage …» → **«Файл на этом ПК: %APPDATA%\Promtova\stores.json»** (в веб-режиме — «в памяти этой сессии»).
  - Кнопка «Экспорт» и «Сбросить» остаются, но «Сбросить» в Electron вместо `localStorage.clear()` должен очищать через `window.promtova.stores.remove(...)` (по обоим ключам) + сброс стора.
- Значок версии в футере: `v1.1.0` → `v1.2.0` (см. §9).

---

## 9. Версия и чейнджлог

- `package.json` → `version: "1.2.0"`.
- Чейнджлог (записать в `README.md` или `CHANGELOG.md`):
  - **v1.2.0** — нативная Windows-версия: упаковка в Electron, установщик `setup.exe` (NSIS), нативное хранилище в `%APPDATA%\Promtova\stores.json` (вместо localStorage, через electron-store), нативные диалоги импорта/экспорта, автообновление (electron-updater), перенос данных из веб-версии.

---

## 10. Что НЕ входит в скоуп (зафиксировать явно)

- ❌ Никакого использования веб-хранилищ (`localStorage`/`sessionStorage`/`indexedDB`/`Cache API`) **в рантайме renderer**. (Исключение — разовая утилита переноса данных из браузера, см. §11.)
- ❌ Менять UI, логику промптов/папок/шаблонов/тем/хоткеев — **не** трогаем (кроме 2 строк про «где данные» в Settings и пути сброса).
- ❌ Code-signing (нет сертификата), сборка под macOS/Linux (этап — Windows).
- ❌ Cloud-синхронизация, бэкапы в облако, многопользовательность.

> ✅ **В скоупе** (были в списке исключений, теперь входят): **автообновление** (electron-updater, §3.4) и **перенос данных из веб-версии** (§11).

---

## 11. Перенос данных из веб-версии (миграция браузера → нативное хранилище)

Вынесено в явный пункт скоупа. Задача — дать пользователю перенести существующую базу из браузерной версии в нативную.

### 11.1 Механизм (разовая утилита, НЕ постоянный слой)
- Перенос работает **один раз** и **не** оставляет web-хранилище в рантайме: это автономный сценарий «первого запуска», а не часть рабочего кода приложения.
- В `%APPDATA%\Promtova\` в main-процессе точка запуска: если `stores.json` ещё не существует (первый запуск/нет данных), предлагаем «Перенести данные из веб-версии». Если данных уже нет смысла переносить — диалог не появляется.

### 11.2 Варианты источника (согласовать один основной)
1. **Рекомендуемый и безопасный:** через нативный диалог файла `.prmt`/`.json` — пользователь сам экспортирует базу из веб-версии (кнопка «Экспорт» в браузере) и импортирует в нативную. Формат уже поддерживается (`parseImportFile`+`applyMerge`). **Не трогает никакие web-хранилища в Electron.**
2. **Однократный доступ к localStorage исходного браузера:** возможно только как **отдельный** dev-time/assistant-сценарий вне приложения: открыть старую веб-страницу в том же Chromium и «вытащить» ключи `promtova-state`/`promtova-theme` в файл. Строго обёрнуто в разовую процедуру, не входит в production-рантайм.
- Default для реализации: **вариант 1** (нативный импорт `.prmt`). Вариант 2 — только по отдельному согласованию (поднимает вопросы приватности/автоматического чтения чужих браузерных данных).
- Формат сохранения — прежний (`ExportData`, `EXPORT_VERSION='1.1'`), с маппингом в структуру нативного стора.

### 11.3 Приёмка миграции
- Экспорт в браузере → запуск нативной версии → импорт → папки и промпты на месте, конфликты разрешаются через MergeModal.
- После переноса рантайм Electron **не содержит** вызовов web-хранилищ (проверка §12.8).

---

## 12. Приёмка (Definition of Done)

1. `npx tsc --noEmit` — выходит с кодом 0.
2. `npm test` — все тесты (старые 93 + новые) зелёные.
3. `npm run lint` — код 0.
4. `npm run desktop:build` — создаёт `setup.exe` без ошибок.
5. Установка и запуск на чистой Windows x64: приложение стартует, все 3-процессные части работают.
6. Нативное хранилище: при первом запуске создаётся `%APPDATA%\Promtova\stores.json`; после создания промпта/темы и перезапуска приложения данные **на месте** (переживают перезапуск, т.к. хранятся на диске, а не в памяти вкладки).
7. Импорт/экспорт через нативные диалоги работают с `.prmt`/`.json`/`.md`/`.txt`.
8. Автообновление: упакованный `setup.exe` корректно обнаруживает новую версию из GitHub Releases, скачивает и устанавливает (или корректно сообщает об отсутствии сети — приложение не падает).
9. Перенос из веб-версии (§11): экспорт в браузере → нативный импорт → папки и промпты на месте, конфликты через MergeModal.
10. Single-confirm: **нигде в сборке renderer нет ни одного обращения к `localStorage`/web-storage** (проверка `rg -n "localStorage|sessionStorage|indexedDB" dist/` — пусто, кроме упоминаний в тексте локализации).

---

## 13. Риски и решения

| Риск | Решение |
|---|---|
| Асинхронная гидрация «проскакивает» пустой seed при старте | Splash/флаг `hasHydrated`; не рендерить App до готовности (или тост «Загрузка…»). Тест §5.3. |
| Zustand async-persist не поддерживает старую локальную структуру | Интерфейс `StateStorage` идентичен localStorage-адаптеру; данные `{state, version}` — те же. Миграция не нужна; перенос браузерных данных — через раздел §11. |
| vite-plugin-singlefile + `file://` в Electron (CORS/reload) | Single-file инлайн не даёт внешних запросов — работает из `file://`. Проверить Reload (HashHistory не нужен, это SPA без роутинга). |
| electron-store версия/API | Используем поддерживаемую версию electron-store (v8+ ESM/CJS совместима с Electron 33); обёртка `storeService.js` изолирует API, чтобы проще менять. |
| Автообновление без code-signing (Windows SmartScreen) | NSIS-обновление работает и без подписи, но возможны предупреждения SmartScreen. Зафиксировать: обновления тестируем локально/в dev; публичную подпись выносим в отдельный этап. |
| Иконка/брендинг | Сгенерировать `build/icon.ico` из существующего лого (или простой квадрат с логотипом). Отдельная подзадача. |
| Данные в `Program Files` (read-only) | Никогда не пишем в каталог установки — только в `%APPDATA%` (electron-store сам пишет в данные приложения). Приёмка §12.6. |

---

## 14. Опциональный бонус (по согласованию, вне основного скоупа)

- GitHub Actions: сборка `setup.exe` в CI (Windows runner), публикация релиза на GitHub Releases (канал для автообновления) + артефакт релиза.
- Перенос из браузера через прямой доступ к `localStorage` чужого браузера (вариант 2 из §11.2) — реализуется только по отдельному согласованию из-за приватности.

---

## Резюме

Переход из веб-версии в нативное Windows-приложение:
1. **Сохранить** весь UI/стор-логику — менять только персистентность и сборку.
2. **Нативное хранилище:** electron-store (JSON в `%APPDATA%\Promtova`), IPC через main-процесс, `sandbox`+`contextIsolation`, **без web-хранилищ в рантайме**.
3. **Установщик:** electron-builder + NSIS → `Промтовая-Setup-1.2.0.exe`, single-instance, иконка, ярлыки.
4. **Автообновление:** electron-updater через GitHub Releases.
5. **Перенос данных из веб-версии:** нативный импорт `.prmt` (диалог) — без чтения web-хранилищ.
6. **Совместимость:** web-режим и vitest работают через in-memory-адаптер; старые функции импорта/экспорта/тем/хоткеев не ломаются.
7. **Приёмка:** tsc + 93+ теста + lint + сборка setup.exe + ручной смоук на чистой Windows + гарантия «нет localStorage в сборке».
