// Контекстное меню папки (§3.3): портал, закрытие по клику вне/Esc/скроллу.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePromtovaStore, useUIStore } from '../store/usePromtovaStore';
import { folderNameById } from '../utils/folders';
import { Pencil, FolderPlus, ArrowUp, ArrowDown, FilePlus, Trash2 } from 'lucide-react';
import { CLOSE_MENUS_EVENT } from '../hooks/useGlobalHotkeys';

interface Props {
  folderId: string;
  x: number;
  y: number;
  onClose: () => void;
}

const FolderContextMenu = ({ folderId, x, y, onClose }: Props) => {
  const { folders, moveFolderUp, moveFolderDown, createPrompt, selectPrompt } = usePromtovaStore();
  const { openRenameFolder, openFolderModal, openDeleteFolder, pushToast } = useUIStore();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  // не выходим за границы вьюпорта
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { offsetWidth: w, offsetHeight: h } = el;
    setPos({
      left: Math.max(8, Math.min(x, window.innerWidth - w - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - h - 8)),
    });
  }, [x, y]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onScroll = () => onClose();
    window.addEventListener('mousedown', onDown);
    window.addEventListener(CLOSE_MENUS_EVENT, onClose);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener(CLOSE_MENUS_EVENT, onClose);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  const name = folderNameById(folders, folderId) ?? '';

  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };

  const items = [
    { icon: <Pencil size={13} />, label: 'Переименовать', onClick: run(() => openRenameFolder(folderId)) },
    { icon: <FolderPlus size={13} />, label: 'Создать подпапку', onClick: run(() => openFolderModal(folderId)) },
    { icon: <ArrowUp size={13} />, label: 'Переместить вверх', onClick: run(() => moveFolderUp(folderId)) },
    { icon: <ArrowDown size={13} />, label: 'Переместить вниз', onClick: run(() => moveFolderDown(folderId)) },
    {
      icon: <FilePlus size={13} />,
      label: 'Создать промпт здесь',
      onClick: run(() => {
        const id = createPrompt(name || 'Development');
        selectPrompt(id);
        pushToast({ type: 'success', message: `Промпт создан в «${name}»` });
      }),
    },
    { icon: <Trash2 size={13} />, label: 'Удалить папку', danger: true, onClick: run(() => openDeleteFolder(folderId)) },
  ];

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={`Действия с папкой «${name}»`}
      className="animate-scale-in fixed z-[60] min-w-[200px] overflow-hidden rounded-lg border py-1"
      style={{
        left: pos.left,
        top: pos.top,
        background: 'var(--bg-elevated)',
        borderColor: 'var(--border-primary)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {items.map((it, i) => (
        <button
          key={i}
          role="menuitem"
          onClick={it.onClick}
          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[12.5px] transition-colors"
          style={{ color: it.danger ? 'var(--status-error)' : 'var(--text-primary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ color: it.danger ? 'var(--status-error)' : 'var(--text-secondary)' }}>
            {it.icon}
          </span>
          {it.label}
        </button>
      ))}
    </div>,
    document.body,
  );
};

export default FolderContextMenu;
