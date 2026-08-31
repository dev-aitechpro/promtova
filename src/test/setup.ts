// Подготовка окружения для тестов (Vitest + jsdom).
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetMemoryStorage } from '../storage/nativeStorage';

// Вместо localStorage.clear() (§4.1 ТЗ) сбрасываем in-memory адаптер нативного
// хранилища — в тестах/веб-режиме данные живут в памяти процесса, не в web-хранилищах.
afterEach(() => {
  cleanup();
  resetMemoryStorage();
});
