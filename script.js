// ============================================
// مدیریت دیتابیس (LocalStorage)
// ============================================

const DB_KEYS = {
    school: 'school_data',
    grades: 'grades_data',
    attendance: 'attendance_data'
};

function getSchoolData() {
    let data = JSON.parse(localStorage.getItem(DB_KEYS.school)) || { teachers: [], admins: [] };
    
    if (!Array.isArray(data.teachers)) data.teachers = [];
    if (!Array.isArray(data.admins)) data.admins = [];
    
    return data;
}

function saveSchoolData(data) {
    localStorage.setItem(DB_KEYS.school, JSON.stringify(data));
}

function getGradesByClass(classId) {
    return JSON.parse(localStorage.getItem(`${DB_KEYS.grades}_${classId}`)) || [];
}

function saveGradesByClass(classId, grades) {
    localStorage.setItem(`${DB_KEYS.grades}_${classId}`, JSON.stringify(grades));
}

function getAttendanceByClass(classId) {
    return JSON.parse(localStorage.getItem(`${DB_KEYS.attendance}_${classId}`)) || {};
}

function saveAttendanceByClass(classId, data) {
    localStorage.setItem(`${DB_KEYS.attendance}_${classId}`, JSON.stringify(data));
}

// ============================================
// سیستم اشتراک مدیر
// ============================================

function activateSubscription(code) {
    const school = getSchoolData();
    const admin = school.admins.find(a => a.subscriptionCode === code.trim().toUpperCase());
    
    if (!admin) {
        return { success: false, message: "کد اشتراک اشتباه است!" };
    }
    
    if (!admin.subscriptionStartDate) {
        admin.subscriptionStartDate = new Date().toISOString().split('T')[0];
        admin.subscriptionEndDate = new Date();
        admin.subscriptionEndDate.setFullYear(admin.subscriptionEndDate.getFullYear() + 1);
        admin.subscriptionEndDate = admin.subscriptionEndDate.toISOString().split('T')[0];
        
        saveSchoolData(school);
    }
    
    const today = new Date().toISOString().split('T')[0];
    if (today > admin.subscriptionEndDate) {
        return { success: false, message: "کد اشتراک شما منقضی شده است!" };
    }
    
    localStorage.setItem('subscription_status', 'active');
    localStorage.setItem('activeAdminId', admin.id);
    return { success: true, message: "اشتراک فعال شد!" };
}

function checkSubscription() {
    return localStorage.getItem('subscription_status') === 'active';
}

// ============================================
// سیستم احراز هویت
// ============================================

function loginAdmin(username, password) {
    const school = getSchoolData();
    const admin = school.admins.find(a => a.username === username && a.password === password);
    if (admin) {
        localStorage.setItem('currentUser', username);
        localStorage.setItem('userRole', 'admin');
        localStorage.setItem('activeAdminId', admin.id);
        return { success: true };
    }
    return { success: false };
}

function loginTeacher(username, password) {
    const school = getSchoolData();
    const teacher = school.teachers.find(t => t.username === username && t.password === password);
    if (teacher) {
        localStorage.setItem('currentUser', username);
        localStorage.setItem('userRole', 'teacher');
        localStorage.setItem('teacherId', teacher.id);
        return { success: true };
    }
    return { success: false };
}

function loginStudent(className, studentName, password) {
    const school = getSchoolData();
    for (let teacher of school.teachers) {
        for (let cls of teacher.classes) {
            if (cls.name === className) {
                const student = cls.students.find(s => s.name === studentName && s.password === password);
                if (student) {
                    localStorage.setItem('currentUser', studentName);
                    localStorage.setItem('userRole', 'student');
                    localStorage.setItem('classId', cls.id);
                    localStorage.setItem('teacherId', teacher.id);
                    return true;
                }
            }
        }
    }
    return false;
}

// ============================================
// سیستم مالک (صالح)
// ============================================

function generateOwnerCode() {
    const date = new Date();
    const year = date.getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `SALEH-${year}-${random}`;
}

function createAdminByOwner(username, password, schoolName, code) {
    const school = getSchoolData();
    const exists = school.admins.find(a => a.username === username);
    if (exists) {
        return { success: false, message: "این نام کاربری قبلاً برای یک مدیر استفاده شده است!" };
    }
    
    const newAdmin = {
        id: Date.now().toString(),
        username: username,
        password: password,
        schoolName: schoolName,
        subscriptionCode: code,
        createdAt: new Date().toLocaleDateString('fa-IR')
    };
    
    school.admins.push(newAdmin);
    saveSchoolData(school);
    return { success: true, admin: newAdmin };
}

function getAdminsList() {
    return getSchoolData().admins || [];
}

function deleteAdminByOwner(adminId) {
    const school = getSchoolData();
    const initialLength = school.admins.length;
    school.admins = school.admins.filter(a => a.id !== adminId);
    
    if (school.admins.length === initialLength) {
        return { success: false, message: "مدیر یافت نشد!" };
    }
    
    saveSchoolData(school);
    return { success: true };
}

// ============================================
// توابع کمکی (معلم، دانش‌آموز، ...)
// ============================================

function createTeacherByAdmin(teacherUsername, teacherPassword, teacherSchoolName) {
    const school = getSchoolData();
    const newTeacher = { 
        id: Date.now().toString(), 
        username: teacherUsername, 
        password: teacherPassword, 
        schoolName: teacherSchoolName, 
        classes: [] // این خط مهم است!
    };
    school.teachers.push(newTeacher);
    saveSchoolData(school);
    return true;
}

// ⚠️ تابع اصلاح شده: همیشه classes را آرایه برمی‌گرداند
function getTeachersList() {
    const school = getSchoolData();
    return (school.teachers || []).map(t => {
        if (!Array.isArray(t.classes)) t.classes = [];
        return t;
    });
}

function generateRandomPassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

function getStudentsList(teacherId, classId) {
    const school = getSchoolData();
    const teacher = school.teachers.find(t => t.id === teacherId);
    if (!teacher) return [];
    const cls = teacher.classes.find(c => c.id === classId);
    return cls ? cls.students : [];
}

function addStudentToClass(teacherId, classId, studentName) {
    const school = getSchoolData();
    const teacher = school.teachers.find(t => t.id === teacherId);
    if (!teacher) return false;
    const cls = teacher.classes.find(c => c.id === classId);
    if (!cls) return false;

    let newId = Date.now().toString() + Math.floor(Math.random() * 1000);
    let newPass = generateRandomPassword();
    let isUnique = false;
    while (!isUnique) {
        const exists = cls.students.find(s => s.password === newPass);
        if (!exists) isUnique = true;
        else newPass = generateRandomPassword();
    }
    cls.students.push({ id: newId, name: studentName, password: newPass });
    saveSchoolData(school);
    return newPass;
}

function deleteStudentFromClass(teacherId, classId, studentId) {
    const school = getSchoolData();
    const teacher = school.teachers.find(t => t.id === teacherId);
    if (!teacher) return false;
    const cls = teacher.classes.find(c => c.id === classId);
    if (!cls) return false;
    cls.students = cls.students.filter(s => s.id !== studentId);
    saveSchoolData(school);
    return true;
}

// ============================================
// توابع پشتیبان‌گیری (سلسله‌مراتبی و جداگانه)
// ============================================

// 1. مالک: برای هر مدیر یک فایل جداگانه
function exportAdminFile(adminId) {
    const school = getSchoolData();
    const admin = school.admins.find(a => a.id === adminId);
    if (!admin) { alert("مدیر یافت نشد!"); return; }
    
    const data = {
        admin: admin,
        schoolData: {
            teachers: school.teachers,
            admins: [admin]
        },
        grades: {},
        attendance: {}
    };
    
    // جمع آوری نمرات و حضور غیاب همه کلاس‌ها (برای مدیر)
    school.teachers.forEach(t => {
        if (!Array.isArray(t.classes)) t.classes = [];
        t.classes.forEach(cls => {
            data.grades[cls.id] = getGradesByClass(cls.id);
            data.attendance[cls.id] = getAttendanceByClass(cls.id);
        });
    });
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Admin_${admin.username}_File.json`;
    link.click();
    URL.revokeObjectURL(url);
    alert("فایل مدیر ساخته شد!");
}

// 2. مدیر: برای هر معلم یک فایل جداگانه
function exportTeacherFile(teacherId) {
    const school = getSchoolData();
    const teacher = school.teachers.find(t => t.id === teacherId);
    if (!teacher) { alert("معلم یافت نشد!"); return; }
    
    if (!Array.isArray(teacher.classes)) teacher.classes = [];
    
    const data = {
        teacher: teacher,
        schoolData: {
            teachers: [teacher],
            admins: []
        },
        grades: {},
        attendance: {}
    };
    
    // جمع آوری نمرات و حضور غیاب کلاس‌های این معلم
    teacher.classes.forEach(cls => {
        data.grades[cls.id] = getGradesByClass(cls.id);
        data.attendance[cls.id] = getAttendanceByClass(cls.id);
    });
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Teacher_${teacher.username}_File.json`;
    link.click();
    URL.revokeObjectURL(url);
    alert("فایل معلم ساخته شد!");
}

// 3. معلم: برای هر کلاس یک فایل جداگانه
function exportClassFile(classId) {
    const school = getSchoolData();
    const teacher = school.teachers.find(t => t.id === localStorage.getItem('teacherId'));
    if (!teacher) { alert("معلم یافت نشد!"); return; }
    
    if (!Array.isArray(teacher.classes)) teacher.classes = [];
    
    const cls = teacher.classes.find(c => c.id === classId);
    if (!cls) { alert("کلاس یافت نشد!"); return; }
    
    const data = {
        teacher: teacher,
        class: cls,
        classId: classId,
        grades: {
            [classId]: getGradesByClass(classId)
        },
        attendance: {
            [classId]: getAttendanceByClass(classId)
        }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Class_${cls.name}_File.json`;
    link.click();
    URL.revokeObjectURL(url);
    alert("فایل کلاس ساخته شد!");
}

// 4. دانش‌آموز: فقط نمرات خودش
function exportStudentFile() {
    const user = localStorage.getItem('currentUser');
    const classId = localStorage.getItem('classId');
    
    const allGrades = getGradesByClass(classId);
    const myGrades = allGrades.filter(g => g.name === user);
    
    const data = {
        student: user,
        classId: classId,
        grades: myGrades
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Student_Backup.json';
    link.click();
    URL.revokeObjectURL(url);
    alert("نسخه پشتیبان دانش‌آموز تهیه شد!");
}

// ============================================
// توابع بازیابی (Import)
// ============================================

function importBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = function(event) {
            const data = JSON.parse(event.target.result);
            
            // اگر فایل شامل admin بود، ذخیره کن
            if (data.admin) {
                const school = getSchoolData();
                school.admins.push(data.admin);
                saveSchoolData(school);
            }
            
            // اگر فایل شامل teacher بود، ذخیره کن
            if (data.teacher) {
                const school = getSchoolData();
                school.teachers.push(data.teacher);
                saveSchoolData(school);
            }
            
            // اگر schoolData بود، ذخیره کن
            if (data.schoolData) {
                saveSchoolData(data.schoolData);
            }
            
            // اگر grades بود، ذخیره کن
            if (data.grades) {
                const gradesKeys = Object.keys(data.grades);
                gradesKeys.forEach(key => {
                    saveGradesByClass(key, data.grades[key]);
                });
            }
            
            // اگر attendance بود، ذخیره کن
            if (data.attendance) {
                const attendanceKeys = Object.keys(data.attendance);
                attendanceKeys.forEach(key => {
                    saveAttendanceByClass(key, data.attendance[key]);
                });
            }
            
            alert("دیتابیس با موفقیت بازیابی شد!");
            window.location.href = 'index.html';
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// ============================================
// توابع عمومی (خروج)
// ============================================
function logout() {
    if (confirm("آیا می‌خواهید خارج شوید؟")) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userRole');
        localStorage.removeItem('teacherId');
        localStorage.removeItem('classId');
        localStorage.removeItem('subscription_status');
        localStorage.removeItem('activeAdminId');
        window.location.href = 'index.html';
    }
}