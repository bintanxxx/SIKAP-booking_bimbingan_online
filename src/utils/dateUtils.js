import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js'; // Penting buat looping slot

// Load plugin-nya
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);

// Set default timezone ke WIB (Indonesia)
// Jadi setiap lu panggil dayjs(), dia otomatis tau lu di Jakarta
dayjs.tz.setDefault("Asia/Jakarta");

export default dayjs;

