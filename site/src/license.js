import './ui.css';
import './cursor.css';
import { mountCursor } from './cursor.js';

const disposeCursor = mountCursor();
import.meta.hot?.dispose(disposeCursor);

import './motion.css';
import { mountPageMotion } from './motion.js';
const disposeMotion = mountPageMotion();
import.meta.hot?.dispose(disposeMotion);
