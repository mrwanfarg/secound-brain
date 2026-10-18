import { api } from '../api.js';
import { store } from '../store.js';
import { Toast } from './Toast.js';
import { Modal } from './Modal.js';
import { getLang } from '../i18n.js';

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createTaskCard(task, { onUpdate = null, onDelete = null, compact = false } = {}) {
  const today = getLocalDate();
  const row = document.createElement('div');
  row.className = `task-row priority-${task.priority || 'medium'}`;
  if (task.completed) row.classList.add('completed');
  row.dataset.taskId = task.id;

  // 1. Checkbox
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-check';
  checkbox.checked = Boolean(task.completed);
  checkbox.setAttribute('aria-label', `Mark task "${task.title}" as ${task.completed ? 'pending' : 'completed'}`);

  checkbox.addEventListener('change', async () => {
    const _ar = getLang() === 'ar';
    try {
      const nextCompleted = checkbox.checked;
      row.classList.toggle('completed', nextCompleted);
      await api.toggleTask(task.id);
      Toast.success(nextCompleted
        ? (_ar ? 'تمت المهمة! ⚡' : 'Task completed! ⚡')
        : (_ar ? 'تم إعادة فتح المهمة' : 'Task reopened'));
      await store.refreshAll();
      if (typeof onUpdate === 'function') onUpdate(task);
    } catch {
      checkbox.checked = !checkbox.checked;
      row.classList.toggle('completed', checkbox.checked);
      Toast.error(getLang() === 'ar' ? 'تعذّر تحديث المهمة' : 'Failed to update task');
    }
  });

  // 2. Details
  const details = document.createElement('div');
  details.className = 'task-details';

  const headerLine = document.createElement('div');
  headerLine.className = 'task-header-line';

  const title = document.createElement('span');
  title.className = 'task-name';
  title.textContent = task.title;
  headerLine.appendChild(title);

  // Priority Badge
  const priorityBadge = document.createElement('span');
  priorityBadge.className = `task-badge badge-${task.priority || 'medium'}`;
  priorityBadge.textContent = task.priority || 'medium';
  headerLine.appendChild(priorityBadge);

  // Category Badge
  if (task.category) {
    const catBadge = document.createElement('span');
    catBadge.className = 'task-badge badge-category';
    catBadge.textContent = task.category;
    headerLine.appendChild(catBadge);
  }

  // Project Tag
  if (task.projectId) {
    const project = store.state.projects.find(p => p.id === task.projectId);
    if (project) {
      const projBadge = document.createElement('span');
      projBadge.className = 'task-badge badge-project';
      projBadge.textContent = `▦ ${project.name}`;
      headerLine.appendChild(projBadge);
    }
  }

  details.appendChild(headerLine);

  // Optional Description
  if (task.description && !compact) {
    const desc = document.createElement('div');
    desc.className = 'task-description';
    desc.textContent = task.description;
    details.appendChild(desc);
  }

  // Meta Row
  const metaRow = document.createElement('div');
  metaRow.className = 'task-meta-row';

  const _ar = getLang() === 'ar';
  // Due Date
  const dueSpan = document.createElement('span');
  if (!task.dueDate) {
    dueSpan.textContent = _ar ? 'لا تاريخ استحقاق' : 'No due date';
  } else if (task.dueDate === today) {
    dueSpan.textContent = _ar
      ? `مستحق اليوم ${task.dueTime ? `الساعة ${task.dueTime}` : ''}`.trim()
      : `Due today ${task.dueTime ? `at ${task.dueTime}` : ''}`;
    dueSpan.style.color = 'var(--cyan)';
  } else if (task.dueDate < today && !task.completed) {
    dueSpan.className = 'task-badge badge-overdue';
    dueSpan.textContent = _ar ? `متأخر · ${task.dueDate}` : `Overdue · ${task.dueDate}`;
  } else {
    dueSpan.textContent = _ar
      ? `يستحق ${task.dueDate} ${task.dueTime ? `(${task.dueTime})` : ''}`.trim()
      : `Due ${task.dueDate} ${task.dueTime ? `(${task.dueTime})` : ''}`;
  }
  metaRow.appendChild(dueSpan);

  // Time Slot
  if (task.timeSlot) {
    const slotSpan = document.createElement('span');
    const slotLabels = getLang() === 'ar'
      ? { morning: 'صباحي', afternoon: 'ظهيرة', evening: 'مساء' }
      : { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };
    slotSpan.textContent = `• ${getLang() === 'ar' ? 'فترة' : 'Slot'}: ${slotLabels[task.timeSlot] || task.timeSlot}`;
    metaRow.appendChild(slotSpan);
  }

  // Time tracking: actual vs minimum goal
  if (task.actualMinutes > 0 || task.minimumMinutes > 0) {
    const actBadge = document.createElement('span');
    actBadge.className = 'task-badge';
    const actual = task.actualMinutes || 0;
    const minGoal = task.minimumMinutes || 0;
    const _ar2 = getLang() === 'ar';

    if (actual > 0 && minGoal > 0) {
      const met = actual >= minGoal;
      actBadge.style.background = met ? 'rgba(80,220,130,0.15)' : 'rgba(255,100,100,0.15)';
      actBadge.style.color = met ? 'var(--green)' : '#ff6464';
      actBadge.style.fontWeight = '700';
      actBadge.textContent = _ar2
        ? `${met ? '✓' : '⚠'} ${actual}د / ${minGoal}د حد أدنى`
        : `${met ? '✓' : '⚠'} ${actual}m / ${minGoal}m min`;
    } else if (actual > 0) {
      actBadge.style.background = 'rgba(91, 224, 235, 0.16)';
      actBadge.style.color = 'var(--cyan)';
      actBadge.style.fontWeight = '700';
      actBadge.textContent = _ar2 ? `⏱ ${actual} دق. مسجلة` : `⏱ ${actual}m tracked`;
    } else if (minGoal > 0) {
      actBadge.style.background = 'rgba(155,123,255,0.12)';
      actBadge.style.color = 'var(--violet-light)';
      actBadge.textContent = _ar2 ? `⏱ حد أدنى: ${minGoal} د.` : `⏱ Min: ${minGoal}m`;
    }
    metaRow.appendChild(actBadge);
  } else if (task.estimatedMinutes) {
    const estSpan = document.createElement('span');
    const _ar3 = getLang() === 'ar';
    estSpan.textContent = _ar3 ? `• ⏱ ${task.estimatedMinutes} د. تقديري` : `• ⏱ ${task.estimatedMinutes}m est`;
    metaRow.appendChild(estSpan);
  }

  details.appendChild(metaRow);

  // 3. Action Buttons
  const actions = document.createElement('div');
  actions.className = 'task-actions';

  // Timer button
  const timerBtn = document.createElement('button');
  timerBtn.type = 'button';
  timerBtn.className = 'btn btn-icon';
  const _isAr = getLang() === 'ar';
  timerBtn.title = _isAr ? `بدء توقيت المهمة: "${task.title}"` : `Start Stopwatch for "${task.title}"`;
  timerBtn.innerHTML = '⏱';
  timerBtn.addEventListener('click', () => {
    store.startStopwatch(task.id, task.title, 'task');
    Toast.info(_isAr ? `⏱ بدأ العداد لمهمة "${task.title}". الانتقال إلى تركيز اليوم...` : `⏱ Stopwatch started for "${task.title}". Opening Today...`);
    // Navigate to Today view to show live stopwatch
    window.dispatchEvent(new CustomEvent('navigate-to', { detail: { page: 'Today' } }));
  });

  // Edit button
  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'btn btn-icon';
  editBtn.title = 'Edit task';
  editBtn.innerHTML = '✎';
  editBtn.addEventListener('click', () => openEditTaskModal(task, onUpdate));

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn btn-icon';
  deleteBtn.title = 'Delete task';
  deleteBtn.innerHTML = '×';
  deleteBtn.style.fontSize = '18px';
  deleteBtn.addEventListener('click', () => {
    const _ar = getLang() === 'ar';
    Modal.confirm({
      title: _ar ? 'حذف المهمة' : 'Delete Task',
      message: _ar ? `هل أنت متأكد من حذف «${task.title}»?` : `Are you sure you want to delete "${task.title}"?`,
      confirmText: _ar ? 'حذف' : 'Delete',
      onConfirm: async () => {
        try {
          await api.deleteTask(task.id);
          row.remove();
          Toast.success(_ar ? 'تم حذف المهمة' : 'Task deleted');
          await store.refreshAll();
          if (typeof onDelete === 'function') onDelete(task);
        } catch {
          Toast.error(_ar ? 'تعذّر حذف المهمة' : 'Could not delete task');
        }
      }
    });
  });

  actions.append(timerBtn, editBtn, deleteBtn);
  row.append(checkbox, details, actions);
  return row;
}

export function openEditTaskModal(task = null, onSaved = null) {
  const isEditing = Boolean(task);
  const projects = store.state.projects;
  const _ar = getLang() === 'ar';

  const form = document.createElement('form');
  form.className = 'task-edit-form';

  const titleGroup = document.createElement('div');
  titleGroup.className = 'form-group';
  titleGroup.innerHTML = `
    <label for="modalTaskTitle">${_ar ? 'عنوان المهمة *' : 'Task Title *'}</label>
    <input type="text" id="modalTaskTitle" class="field" required maxlength="200" value="${task ? task.title : ''}" placeholder="${_ar ? 'مثال: مراجعة تقرير الربع السنوي' : 'e.g. Complete quarterly product review'}">
  `;

  const descGroup = document.createElement('div');
  descGroup.className = 'form-group';
  descGroup.innerHTML = `
    <label for="modalTaskDesc">${_ar ? 'الوصف (اختياري)' : 'Description (optional)'}</label>
    <textarea id="modalTaskDesc" class="field" rows="3" placeholder="${_ar ? 'سياق أو نقاط فرعية...' : 'Context, links, or sub-points...'}">${task ? task.description || '' : ''}</textarea>
  `;

  const row1 = document.createElement('div');
  row1.className = 'form-grid-2';
  row1.innerHTML = `
    <div class="form-group">
      <label for="modalTaskDate">${_ar ? 'تاريخ الجدولة' : 'Scheduled Date'}</label>
      <input type="date" id="modalTaskDate" class="field" value="${task ? task.dueDate || '' : getLocalDate()}">
    </div>
    <div class="form-group">
      <label for="modalTaskTime">${_ar ? 'وقت الاستحقاق' : 'Due Time'}</label>
      <input type="time" id="modalTaskTime" class="field" value="${task ? task.dueTime || '09:00' : '09:00'}">
    </div>
  `;

  const row2 = document.createElement('div');
  row2.className = 'form-grid-2';
  row2.innerHTML = `
    <div class="form-group">
      <label for="modalTaskPriority">${_ar ? 'الأولوية' : 'Priority'}</label>
      <select id="modalTaskPriority" class="field">
        <option value="urgent" ${task && task.priority === 'urgent' ? 'selected' : ''}>🔥 ${_ar ? 'عاجل' : 'Urgent'}</option>
        <option value="high" ${task && task.priority === 'high' ? 'selected' : ''}>⚡ ${_ar ? 'عالية' : 'High'}</option>
        <option value="medium" ${!task || task.priority === 'medium' ? 'selected' : ''}>✦ ${_ar ? 'متوسطة' : 'Medium'}</option>
        <option value="low" ${task && task.priority === 'low' ? 'selected' : ''}>☕ ${_ar ? 'منخفضة' : 'Low'}</option>
      </select>
    </div>
    <div class="form-group">
      <label for="modalTaskSlot">${_ar ? 'فترة العمل' : 'Time Slot'}</label>
      <select id="modalTaskSlot" class="field">
        <option value="morning" ${!task || task.timeSlot === 'morning' ? 'selected' : ''}>🌅 ${_ar ? 'صباحي (08:00 - 12:00)' : 'Morning (08:00 - 12:00)'}</option>
        <option value="afternoon" ${task && task.timeSlot === 'afternoon' ? 'selected' : ''}>☀️ ${_ar ? 'ظهيرة (12:00 - 17:00)' : 'Afternoon (12:00 - 17:00)'}</option>
        <option value="evening" ${task && task.timeSlot === 'evening' ? 'selected' : ''}>🌙 ${_ar ? 'مساء (17:00 - 21:00)' : 'Evening (17:00 - 21:00)'}</option>
      </select>
    </div>
  `;

  const row3 = document.createElement('div');
  row3.className = 'form-grid-2';
  row3.innerHTML = `
    <div class="form-group">
      <label for="modalTaskEst">${_ar ? 'الوقت المتوقع (دقيقة)' : 'Estimated Minutes'}</label>
      <input type="number" id="modalTaskEst" class="field" min="5" step="5" value="${task ? task.estimatedMinutes || 30 : 30}">
    </div>
    <div class="form-group">
      <label for="modalTaskMinTime">⏱ ${_ar ? 'حد وقت أدنى (دقيقة)' : 'Minimum Time Goal (min)'}</label>
      <input type="number" id="modalTaskMinTime" class="field" min="0" step="5" value="${task ? task.minimumMinutes || 0 : 0}" placeholder="${_ar ? '0 = بدون حد أدنى' : '0 = no minimum'}">
    </div>
  `;

  const catGroup = document.createElement('div');
  catGroup.className = 'form-group';
  catGroup.innerHTML = `
    <label for="modalTaskCategory">${_ar ? 'التصنيف' : 'Category'}</label>
    <select id="modalTaskCategory" class="field">
      <option value="Deep Work" ${task && task.category === 'Deep Work' ? 'selected' : ''}>${_ar ? 'عمل عميق' : 'Deep Work'}</option>
      <option value="Engineering" ${task && task.category === 'Engineering' ? 'selected' : ''}>${_ar ? 'هندسة' : 'Engineering'}</option>
      <option value="Meeting" ${task && task.category === 'Meeting' ? 'selected' : ''}>${_ar ? 'اجتماع' : 'Meeting'}</option>
      <option value="Health" ${task && task.category === 'Health' ? 'selected' : ''}>${_ar ? 'صحة ولياقة' : 'Health & Fitness'}</option>
      <option value="Admin" ${task && task.category === 'Admin' ? 'selected' : ''}>${_ar ? 'إدارة وعمليات' : 'Admin & Ops'}</option>
      <option value="Learning" ${task && task.category === 'Learning' ? 'selected' : ''}>${_ar ? 'تعلم' : 'Learning'}</option>
    </select>
  `;

  form.append(titleGroup, descGroup, row1, row2, row3, catGroup);

  Modal.show({
    title: isEditing ? (_ar ? 'تعديل المهمة' : 'Edit Task') : (_ar ? 'جدولة مهمة جديدة' : 'Schedule New Task'),
    content: form,
    footerButtons: [
      { text: _ar ? 'إلغاء' : 'Cancel', className: 'btn-secondary', onClick: () => Modal.close() },
      {
        text: isEditing ? (_ar ? 'حفظ التغييرات' : 'Save Changes') : (_ar ? '+ إنشاء مهمة' : '+ Create Task'),
        className: 'btn-primary',
        onClick: async () => {
          const titleVal = form.querySelector('#modalTaskTitle').value.trim();
          if (!titleVal) {
            Toast.error(_ar ? 'أدخل عنوان المهمة' : 'Please enter a task title');
            return;
          }

          const payload = {
            title: titleVal,
            description: form.querySelector('#modalTaskDesc').value.trim(),
            dueDate: form.querySelector('#modalTaskDate').value,
            dueTime: form.querySelector('#modalTaskTime').value,
            priority: form.querySelector('#modalTaskPriority').value,
            timeSlot: form.querySelector('#modalTaskSlot').value,
            projectId: null,
            estimatedMinutes: Number(form.querySelector('#modalTaskEst').value) || 30,
            minimumMinutes: Number(form.querySelector('#modalTaskMinTime').value) || 0,
            category: form.querySelector('#modalTaskCategory').value
          };

          try {
            if (isEditing) {
              await api.updateTask(task.id, payload);
              Toast.success(_ar ? 'تم تحديث المهمة بنجاح' : 'Task updated successfully');
            } else {
              await api.createTask(payload);
              Toast.success(_ar ? 'تم إنشاء المهمة وجدولتها! ⚡' : 'Task created and scheduled! ⚡');
            }
            Modal.close();
            await store.refreshAll();
            if (typeof onSaved === 'function') onSaved();
          } catch (err) {
            Toast.error(err.message || (_ar ? 'تعذّر حفظ المهمة' : 'Failed to save task'));
          }
        }
      }
    ]
  });
}
