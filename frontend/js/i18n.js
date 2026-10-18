/**
 * i18n — Simple bilingual translation system (English / Arabic)
 * Usage:  import { t, setLang, getLang } from './i18n.js';
 *         t('dashboard.title')  →  "Command Dashboard" | "لوحة التحكم"
 */

const translations = {
  en: {
    // ── Navigation ──────────────────────────────────────────────
    nav: {
      dashboard:  'Dashboard',
      today:      "Today's Focus",
      weekly:     'Weekly',
      tasks:      'Tasks',
      notes:      'Notes',
      insights:   'Insights',
      settings:   'Settings',
    },

    // ── Dashboard ────────────────────────────────────────────────
    dashboard: {
      title:    'Command Dashboard',
      subtitle: 'Your schedule, habits, and cognitive progress — all in one unified control center.',
      greeting_morning: 'Good morning',
      greeting_afternoon: 'Good afternoon',
      greeting_evening: 'Good evening',
      intention_placeholder: "What's your #1 focus today?",
      today_focus: "Today's Focus",
      weekly_progress: 'Weekly Progress',
      tasks_completed: 'Tasks Completed',
      habits_done: 'Habits Done',
      hours_logged: 'Hours Logged',
      streak: 'Day Streak',
    },

    // ── Today ────────────────────────────────────────────────────
    today: {
      title: "Today's Focus & Daily Command",
      tracker_label: 'LIVE ACTIVITY TIME TRACKER',
      no_session: 'No active session',
      start_stopwatch: '▶ Start Stopwatch',
      pause: '⏸ Pause',
      resume: '▶ Resume',
      finish: '⏹ Finish & Log to Tasks',
      reset: '↺ Reset',
      ready_caption: 'Choose any habit or task below to start timing',
      recording_caption: '⏱ Recording time live...',
      paused_caption: 'Paused · Click Resume to continue',
      done_suffix: 'done!',
      logged_suffix: 'logged successfully',
      habits_title: "Today's Scheduled Habits",
      habits_desc: 'Habits scheduled for today from your Weekly Plan.',
      start_time: '▶ Start Time',
      finish_log: '⏹ Finish & Log',
      completed_today: '✓ Completed for today',
      pending_today: 'Pending today',
      week_progress: 'Week Progress',
      done_badge: '✓ Done!',
      schedule_title: "Today's Task Schedule",
      schedule_desc: 'Grouped into morning, afternoon, and evening focus blocks.',
      morning: '🌅 Morning Deep Work',
      afternoon: '☀️ Afternoon Execution',
      evening: '🌙 Evening Wrap-up',
      add_task: '+ Schedule Task for Today',
      view_weekly: 'View Weekly Matrix →',
    },

    // ── Weekly ───────────────────────────────────────────────────
    weekly: {
      title: "This Week's Habit & Goal Matrix",
      overall_progress: 'Weekly Target Progress',
      overall_desc: 'Discipline builds momentum. Check each day as you fulfill your habits.',
      overall_completion: 'Overall Completion',
      schedule_label: 'Weekly Habits Schedule',
      today_col: 'TODAY',
      habit_col: 'Habit / Routine',
      progress_col: 'Progress',
      actions_col: 'Actions',
      add_habit: 'Add New Habit to Weekly Schedule',
      add_habit_desc: 'Choose habit name, target days, and which days of the week it will appear on Today\'s Focus.',
      habit_name: 'Habit Name *',
      habit_name_placeholder: 'e.g. Gym Workout, Reading 20 Pages',
      target_days: 'Target Days Per Week',
      select_days: 'Select Scheduled Days:',
      add_btn: '+ Add Habit to Schedule',
      logged_week: 'logged this week',
      hours_short: 'h',
      days_short: 'd/wk',
      open_today: "Open Today's Focus →",
      target_prefix: 'Target:',
    },

    // ── Tasks ────────────────────────────────────────────────────
    tasks: {
      title: 'Task Scheduling Command Center',
      subtitle: 'Plan, organize, and execute your tasks with precision timeframes.',
      reschedule_btn: '⚡ Reschedule Overdue to Today',
      add_task: '+ Schedule Task',
      search_placeholder: 'Search tasks by title, category, or notes...',
      filter_all: 'All Tasks',
      filter_today: 'Today',
      filter_pending: 'Pending',
      filter_completed: 'Completed',
      filter_urgent: '🔥 Urgent',
      filter_overdue: '⚠️ Overdue',
      view_list: '☰ List',
      view_kanban: '▦ Kanban',
      view_schedule: '◷ Schedule',
      monthly_tracker_title: '🎯 Monthly Habit Goals & Daily Time Tracker',
      monthly_tracker_desc: 'Connected to your Weekly schedule. Select a routine, set target days for this month, and view day-by-day logged hours.',
      select_habit_label: 'Habit from Weekly Schedule',
      select_habit_placeholder: '-- Choose a Habit --',
      monthly_target_label: 'Target Days This Month',
      save_target_btn: '💾 Save Goal',
      days_completed_label: 'Days Completed',
      days_remaining_label: 'Days Remaining',
      goal_achieved: '🎉 Goal Achieved!',
      total_hours_label: 'Total Hours Logged',
      active_month_label: 'Active Month',
      daily_log_title: '📅 Day-by-Day Time Log',
      daily_log_date: 'Date & Day',
      daily_log_duration: 'Logged Duration',
      daily_log_source: 'Status & Session Details',
      no_daily_logs: 'No focus sessions logged yet for this habit. Start timing in Today\'s Focus or check off in Weekly to record!',
      grand_total: 'Total Logged Time',
      no_weekly_habits_hint: 'No habits found in your Weekly schedule yet. Add habits in Weekly first!',
      open_weekly_btn: 'Open Weekly Matrix →',
      completed_today_from_schedule: 'Completed Today from Schedule',
      total_time_logged_today: 'Total time logged on today\'s items:',
    },

    // ── Notes ────────────────────────────────────────────────────
    notes: {
      title: 'Knowledge Base & Capture',
      subtitle: 'A second brain for your mental clarity — notes, insights, and references.',
    },

    // ── Insights ─────────────────────────────────────────────────
    insights: {
      title: 'Productivity Velocity & Analytics',
      subtitle: 'Deep dive into your task throughput, completion velocity, and focus hours.',
    },

    // ── Settings ─────────────────────────────────────────────────
    settings: {
      title: 'Workspace Settings & Multi-User Cloud',
      subtitle: 'Manage your account, connect Supabase cloud for cross-device sync, and configure themes.',
      language_title: '🌐 Dashboard Language & Direction',
      language_desc: 'Switch between English (LTR) and Arabic (العربية - RTL). Your choice applies across all pages.',
      lang_en: 'English (LTR)',
      lang_ar: 'العربية (RTL)',
      language_switched: 'Language preferences updated successfully!',
      theme_title: 'Appearance & Theme',
      theme_desc: 'Choose your workspace aesthetic tone.',
      sign_out: 'Sign Out',
      switch_account: 'Switch Account',
    },

    // ── Common ───────────────────────────────────────────────────
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      loading: 'Loading...',
      error: 'An error occurred',
      success: 'Success',
      confirm_delete: 'Are you sure you want to delete',
      weekly_habit_badge: 'Weekly Habit',
      minutes_short: 'm',
      hours_short: 'h',
      no_tasks: 'No tasks',
    }
  },

  // ─────────────────────────────────────────────────────────────
  ar: {
    nav: {
      dashboard:  'لوحة التحكم',
      today:      'تركيز اليوم',
      weekly:     'الأسبوعي',
      tasks:      'المهام',
      notes:      'الملاحظات',
      insights:   'التحليلات',
      settings:   'الإعدادات',
    },

    dashboard: {
      title:    'لوحة التحكم الرئيسية',
      subtitle: 'جدولك وعاداتك وتقدمك المعرفي — كل شيء في مركز تحكم موحد.',
      greeting_morning: 'صباح الخير',
      greeting_afternoon: 'مساء الخير',
      greeting_evening: 'مساء النور',
      intention_placeholder: 'ما هو تركيزك الأول اليوم؟',
      today_focus: 'تركيز اليوم',
      weekly_progress: 'تقدم الأسبوع',
      tasks_completed: 'المهام المنجزة',
      habits_done: 'العادات المنجزة',
      hours_logged: 'الساعات المسجلة',
      streak: 'أيام متتالية',
    },

    today: {
      title: 'تركيز اليوم والأوامر اليومية',
      tracker_label: 'متتبع الوقت المباشر',
      no_session: 'لا توجد جلسة نشطة',
      start_stopwatch: '▶ ابدأ الساعة',
      pause: '⏸ إيقاف مؤقت',
      resume: '▶ استئناف',
      finish: '⏹ إنهاء وتسجيل في المهام',
      reset: '↺ إعادة ضبط',
      ready_caption: 'اختر عادة أو مهمة أدناه لبدء التوقيت',
      recording_caption: '⏱ تسجيل الوقت مباشرة...',
      paused_caption: 'متوقف مؤقتاً · اضغط استئناف للمتابعة',
      done_suffix: 'خلصت!',
      logged_suffix: 'تم التسجيل بنجاح',
      habits_title: 'عادات اليوم المجدولة',
      habits_desc: 'العادات المجدولة لليوم من خطتك الأسبوعية.',
      start_time: '▶ ابدأ التوقيت',
      finish_log: '⏹ إنهاء وتسجيل',
      completed_today: '✓ مكتملة اليوم',
      pending_today: 'قيد الانتظار',
      week_progress: 'تقدم الأسبوع',
      done_badge: '✓ خلصت!',
      schedule_title: 'جدول مهام اليوم',
      schedule_desc: 'مجمعة في كتل العمل الصباحية والمسائية والليلية.',
      morning: '🌅 عمل الصباح',
      afternoon: '☀️ تنفيذ الظهيرة',
      evening: '🌙 ختام المساء',
      add_task: '+ جدولة مهمة لليوم',
      view_weekly: 'عرض المصفوفة الأسبوعية →',
    },

    weekly: {
      title: 'مصفوفة العادات والأهداف الأسبوعية',
      overall_progress: 'تقدم الهدف الأسبوعي',
      overall_desc: 'الانضباط يبني الزخم. علم على كل يوم تنجز فيه عادتك.',
      overall_completion: 'الإتمام الكلي',
      schedule_label: 'جدول العادات الأسبوعية',
      today_col: 'اليوم',
      habit_col: 'العادة / الروتين',
      progress_col: 'التقدم',
      actions_col: 'إجراءات',
      add_habit: 'إضافة عادة جديدة للجدول الأسبوعي',
      add_habit_desc: 'اختر اسم العادة وأيام الهدف والأيام التي ستظهر فيها في تركيز اليوم.',
      habit_name: 'اسم العادة *',
      habit_name_placeholder: 'مثال: تمرين الجيم، قراءة 20 صفحة',
      target_days: 'أيام الهدف في الأسبوع',
      select_days: 'اختر الأيام المجدولة:',
      add_btn: '+ إضافة عادة للجدول',
      logged_week: 'مسجل هذا الأسبوع',
      hours_short: 'س',
      days_short: 'ي/أسبوع',
      open_today: 'افتح تركيز اليوم →',
      target_prefix: 'الهدف:',
    },

    tasks: {
      title: 'مركز جدولة المهام',
      subtitle: 'خطط ونظم ونفذ مهامك بأطر زمنية دقيقة.',
      reschedule_btn: '⚡ إعادة جدولة المتأخرة لليوم',
      add_task: '+ جدولة مهمة',
      search_placeholder: 'ابحث في المهام بالعنوان أو الفئة...',
      filter_all: 'كل المهام',
      filter_today: 'اليوم',
      filter_pending: 'قيد الانتظار',
      filter_completed: 'المكتملة',
      filter_urgent: '🔥 عاجل',
      filter_overdue: '⚠️ متأخرة',
      view_list: '☰ قائمة',
      view_kanban: '▦ كانبان',
      view_schedule: '◷ جدول',
      monthly_tracker_title: '🎯 أهداف العادات الشهرية وسجل الوقت اليومي',
      monthly_tracker_desc: 'متصل بجدولك الأسبوعي. اختر عادة من الجدول، وحدد هدفك من الأيام هذا الشهر، وتابع ساعات وسجل إنجازك يوم بيوم.',
      select_habit_label: 'اختر عادة من جدول الأسبوع',
      select_habit_placeholder: '-- اختر عادة من الجدول --',
      monthly_target_label: 'أيام الهدف هذا الشهر',
      save_target_btn: '💾 حفظ الهدف',
      days_completed_label: 'الأيام المنجزة',
      days_remaining_label: 'الأيام المتبقية',
      goal_achieved: '🎉 تم تحقيق الهدف!',
      total_hours_label: 'إجمالي الساعات المسجلة',
      active_month_label: 'الشهر الحالي',
      daily_log_title: '📅 سجل الوقت يوم بيوم',
      daily_log_date: 'التاريخ واليوم',
      daily_log_duration: 'الوقت المستغرق',
      daily_log_source: 'الحالة وتفاصيل الجلسة',
      no_daily_logs: 'لم يتم تسجيل أوقات لهذه العادة حتى الآن. شغل العداد في تركيز اليوم أو علم عليها في الأسبوعي لتسجيل الوقت!',
      grand_total: 'إجمالي الوقت المسجل',
      no_weekly_habits_hint: 'لا توجد عادات مسجلة في جدول الأسبوع بعد. أضف عاداتك من صفحة الأسبوعي أولاً!',
      open_weekly_btn: 'فتح جدول الأسبوع →',
      completed_today_from_schedule: 'المنجز اليوم من الجدول',
      total_time_logged_today: 'إجمالي الوقت المسجل لمهام اليوم:',
    },

    notes: {
      title: 'قاعدة المعرفة والتقاط الأفكار',
      subtitle: 'ذاكرتك الثانية للوضوح الذهني — ملاحظات ورؤى ومراجع.',
    },

    insights: {
      title: 'سرعة الإنتاجية والتحليلات',
      subtitle: 'تعمق في إنتاجية مهامك وسرعة إنجازها وساعات التركيز.',
    },

    settings: {
      title: 'إعدادات مساحة العمل والسحابة',
      subtitle: 'أدر حسابك، اربط Supabase للمزامنة، واضبط المظهر واللغة.',
      language_title: '🌐 لغة لوحة التحكم واتجاه العرض',
      language_desc: 'بدّل بين الإنجليزية (LTR) والعربية (RTL). يُطبق اختيارك في كافة صفحات النظام.',
      lang_en: 'English (إنجليزية)',
      lang_ar: 'العربية (Arabic)',
      language_switched: 'تم تحديث تفضيلات اللغة بنجاح!',
      theme_title: 'المظهر والثيم',
      theme_desc: 'اختر المظهر والسمة البصرية للوحة التحكم.',
      sign_out: 'تسجيل الخروج',
      switch_account: 'تبديل الحساب',
    },

    common: {
      save: 'حفظ',
      cancel: 'إلغاء',
      delete: 'حذف',
      edit: 'تعديل',
      close: 'إغلاق',
      loading: 'جاري التحميل...',
      error: 'حدث خطأ',
      success: 'نجح',
      confirm_delete: 'هل أنت متأكد من حذف',
      weekly_habit_badge: 'عادة أسبوعية',
      minutes_short: 'د',
      hours_short: 'س',
      no_tasks: 'لا توجد مهام',
    }
  }
};

// ── State ─────────────────────────────────────────────────────
const LANG_KEY = 'secondBrain_language';

export function getLang() {
  return localStorage.getItem(LANG_KEY) || 'en';
}

export function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
  // Apply RTL direction for Arabic
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lang);
  // Dispatch event so views can re-render
  window.dispatchEvent(new CustomEvent('lang-changed', { detail: { lang } }));
}

/**
 * Translate a dot-notation key, e.g. t('today.start_stopwatch')
 * Falls back to English if key is missing in Arabic.
 */
export function t(key) {
  const lang = getLang();
  const parts = key.split('.');
  let result = translations[lang];
  for (const part of parts) {
    result = result?.[part];
    if (result === undefined) break;
  }
  // Fallback to English
  if (result === undefined) {
    result = translations.en;
    for (const part of parts) {
      result = result?.[part];
      if (result === undefined) break;
    }
  }
  return result ?? key;
}

// Apply stored language on load
export function initLang() {
  const lang = getLang();
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lang);
}
