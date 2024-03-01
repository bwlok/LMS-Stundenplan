let CALENDAR = null; // Das Kalender-Objekt von FullCalendar
let STUNDENPLAN = null; // Der Inhalt von stundenplan.json oder vertretungsplan.json

// DO NOT USE IN PRODUCTION
// HTTP IS NOT SECURE
let server = "http://localhost:40047/"
let username = "username"
let password = "password"

let target_student_ref;

async function init() {
    $('#bittewarten').show();
    reloadTimetableFile();

    //$('#bittewaehlen').hide();
    //$('#bittewarten').show();
    //$('#plantyp').val("vertretungsplan");

    $.ajaxSetup({cache: false});

    //moment.locale('de');

    CALENDAR = new FullCalendar.Calendar(document.getElementById('calendar'), {
        plugins: ['timeGrid'], views: {
            timeGrid: {
                minTime: '07:00:00', maxTime: '19:00:00', nowIndicator: true, weekends: false,
            }
        }, allDaySlot: false, height: "auto", locale: 'de', themeSystem: 'bootstrap',

        eventRender: function (info) {
            //console.log("lala: " + info.event.extendedProps)
            var $eventinfo = $('#termintemplate').clone().removeAttr('id');
            //console.log($eventinfo)

            if (info.event.extendedProps.changes) {
                var aenderung = info.event.extendedProps.changes;
                var $aenderung = $($('#aenderungtemplate').html());
                console.log(aenderung);
                const aenderungTypNr = getAenderungProperty(aenderung, 'changeType'); // Nummer von 0 bis 8. Bedeutung: siehe globales Object aenderungTypen
                const aenderungGrundTyp = getAenderungProperty(aenderung, 'reasonType'); // Meist nur classAbsence oder teacherAbsence
                let aenderungGrund = getAenderungProperty(aenderung, 'reasonCode');  // Z.B. kr (krank), bö (Böger-Tag). sollte nicht veröffentlicht werden.
                const aenderungTitel = getAenderungProperty(aenderung, 'caption');
                let aenderungInformation = getAenderungProperty(aenderung, 'information');
                const aenderungMessage = getAenderungProperty(aenderung, 'message');
                const newTeacherCodes = getAenderungProperty(aenderung, 'newTeacherCodes');
                const absentTeacherCodes = getAenderungProperty(aenderung, 'absentTeacherCodes');
                const newRoomCodes = getAenderungProperty(aenderung, 'newRoomCodes');
                const absentRoomCodes = getAenderungProperty(aenderung, 'absentRoomCodes')
                const cancelled = getAenderungProperty(aenderung, 'cancelled')
                if (aenderungTitel === "Raumänderung") $(info.el).addClass('faelltaus')
                if (cancelled) {
                    $(info.el).addClass('cancelled')
                } else {
                    $(info.el).addClass(aenderungGrundTyp);
                }
                $(info.el).data('davinci')



                console.log(aenderungGrund);
                console.log(aenderungTitel);

                if (aenderungTypNr === 4) {
                    $(info.el).addClass('aenderung4');
                } else if (aenderungTypNr === 3) {
                    $(info.el).addClass('zusatzunterricht');
                } else if (aenderungTypNr === 6) {
                    $(info.el).addClass('lehrerfehlt');
                }

                $aenderung.find('.caption').html(aenderungTitel);
                //$aenderung.find('.grund').html('Änderungsgrund: '+aenderungTypen[aenderungTypNr]['text']);

                if (newTeacherCodes) $aenderung.find('.caption').append(` ${absentTeacherCodes} &rightarrow; ${newTeacherCodes}`);

                if (newRoomCodes) $aenderung.find('.caption').append(` ${absentRoomCodes} &rightarrow; ${newRoomCodes}`);


                $aenderung.find('.information').html(aenderungInformation);
                $aenderung.find('.message').html(aenderungMessage);

                if (aenderungGrund) {
                    if (aenderungGrund === "kra") aenderungGrund = "Krank";
                    if (aenderungGrund === "fobi") aenderungGrund = "Fortbildung";
                    $aenderung.find('.grund').html(aenderungGrund);
                }


                $eventinfo.prepend($aenderung);
            }


            $eventinfo.find('.titel').html(info.event.extendedProps.titel);
            $eventinfo.find('.klassen').html(info.event.extendedProps.klassen);
            $eventinfo.find('.lehrer').html(info.event.extendedProps.lehrer);
            $eventinfo.find('.raeume').html(info.event.extendedProps.raeume);
            $eventinfo.find('.bemerkungen').html(info.event.extendedProps.bemerkungen);

            $(info.el).append($eventinfo);

        }


    });
    var newEvent = {
        id: 'event1',
        title: '',
        start: '2024-02-21T09:45:00',
        end: '2024-02-21T10:45:00',
        allDay: false,
        extendedProps: {
            titel: 'Titel',
            klassen: 'Klasse',
            lehrer: 'Lehrer',
            raeume: 'Raum',
            woche: 'Woche',
            bemerkungen: 'Bemerkungen',
        }
    };

    //CALENDAR.addEvent(newEvent);

    CALENDAR.render();

}

function populate_select() {

    let lastmodified = STUNDENPLAN['about']['serverTimeStamp'];
    console.log(lastmodified);
    const lastmodified_element = document.getElementById("lastmodified");

    lastmodified = formatDate(lastmodified);
    lastmodified_element.textContent = "Letzte Änderung: "+lastmodified;

    //$('#lastmodified').html('Letzte Änderung: ' + lastmodified.format('ddd, DD. MMM kk:mm'))

    const studentSelect = document.getElementById("studentSelect");

    const classSelect = document.getElementById("classSelect");

    classSelect.selectedIndex = 0;
    studentSelect.selectedIndex = 0;

    const Class = STUNDENPLAN.result.classes;

    // Populate dropdown options with sorted student names
    Class.forEach(Klasse => {
        const option = document.createElement("option");
        option.text = Klasse.code;
        option.value = Klasse.id;
        studentSelect.appendChild(option);
    });

    studentSelect.addEventListener("change", function () {
        const selectedClassID = this.value;
        const selectedClass = STUNDENPLAN.result.classes.find(student => student.id === selectedClassID);
        if (selectedClass) {
            target_student_ref = `${selectedClass.code}`;
            load_class_lessons();
        }
    });

    $('#bittewarten').hide();


    // Populate dropdown options with sorted student names
    /*Class.forEach(Klasse => {
        const option = document.createElement("option");
        option.text = Klasse.code;
        option.value = Klasse.id;
        studentSelect.appendChild(option);
    });*/

    classSelect.addEventListener("change", function () {
        while (studentSelect.options.length > 0) {
            studentSelect.remove(0);
        }
        if (this.value === "student") {
            const option = document.createElement("option");
            option.text = "Bitte wählen";
            option.value = "choose";
            studentSelect.appendChild(option);

            const sortedStudents = STUNDENPLAN.result.students.sort((a, b) => a.lastName.localeCompare(b.lastName));

            // Populate dropdown options with sorted student names
            sortedStudents.forEach(student => {
                if (student.name) {
                    const option = document.createElement("option");
                    option.text = student.name;
                    option.value = student.id;
                    studentSelect.appendChild(option);
                }
            });

            // Add event listener for dropdown change
            studentSelect.addEventListener("change", function () {
                const selectedStudentId = this.value;
                const selectedStudent = STUNDENPLAN.result.students.find(student => student.id === selectedStudentId);
                if (selectedStudent) {
                    target_student_ref = `${selectedStudent.id}`;
                    console.log(`ID: ${selectedStudent.id}, Name: ${selectedStudent.name}`);
                    load_student_lessons();
                }
            });
        } else if (this.value === "class") {
            const Class = STUNDENPLAN.result.classes;

            const option = document.createElement("option");
            option.text = "Bitte wählen";
            option.value = "choose";
            studentSelect.appendChild(option);


            // Populate dropdown options with sorted student names
            Class.forEach(Klasse => {
                const option = document.createElement("option");
                option.text = Klasse.code;
                option.value = Klasse.id;
                studentSelect.appendChild(option);
            });

            // Add event listener for dropdown change
            studentSelect.addEventListener("change", function () {
                const selectedClassID = this.value;
                const selectedClass = STUNDENPLAN.result.classes.find(student => student.id === selectedClassID);
                if (selectedClass) {
                    target_student_ref = `${selectedClass.code}`;
                    load_class_lessons();
                }
            });

        } else if (this.value === "teacher") {
            const sortedTeachers = STUNDENPLAN.result.teachers.sort((a, b) => a.code.localeCompare(b.code));

            const option = document.createElement("option");
            option.text = "Bitte wählen";
            option.value = "choose";
            studentSelect.appendChild(option);

            sortedTeachers.forEach(teacher => {
                const option = document.createElement("option");
                option.text = teacher.code;
                option.value = teacher.id;
                studentSelect.appendChild(option);
            });

            studentSelect.addEventListener("change", function () {
                const selectedStudentId = this.value;
                const selectedStudent = STUNDENPLAN.result.teachers.find(student => student.id === selectedStudentId);
                if (selectedStudent) {
                    target_student_ref = `${selectedStudent.id}`;
                    console.log(`ID: ${selectedStudent.id}, Name: ${selectedStudent.name}`);
                    load_student_lessons();
                }
            });
        } else if (this.value === "room") {
            const sortedTeachers = STUNDENPLAN.result.rooms.sort((a, b) => a.code.localeCompare(b.code));

            const option = document.createElement("option");
            option.text = "Bitte wählen";
            option.value = "choose";
            studentSelect.appendChild(option);

            sortedTeachers.forEach(teacher => {
                const option = document.createElement("option");
                option.text = teacher.code;
                option.value = teacher.id;
                studentSelect.appendChild(option);
            });

            studentSelect.addEventListener("change", function () {
                const selectedStudentId = this.value;
                const selectedStudent = STUNDENPLAN.result.rooms.find(student => student.id === selectedStudentId);
                if (selectedStudent) {
                    target_student_ref = `${selectedStudent.id}`;
                    console.log(`ID: ${selectedStudent.id}, Name: ${selectedStudent.name}`);
                    load_student_lessons();
                }
            });
        }
        console.log(this.value);
    })

}

function load_class_lessons() {
    //Why implement changeType if its always 0 ._.
    CALENDAR.removeAllEvents();
    //console.clear();

    let cid;
    let remarks;

    if (target_student_ref !== "") {
        for (let lesson of STUNDENPLAN["result"]["displaySchedule"]["lessonTimes"]) {

            if (lesson['classCodes']) {
                if (lesson['classCodes'].includes(target_student_ref)) {
                    for (let date of lesson['dates']) {
                        //courseRef
                        const course = STUNDENPLAN["result"]["courses"].find(course => course.id === lesson['courseRef']);
                        console.log(lesson);
                        console.log(lesson['courseRef']);
                        console.log(course);
                        const {start, end} = convertToISODate(date, lesson['startTime'], lesson['endTime']);
                        //console.log("Start:", start);
                        //console.log("End:", end);

                        if (course) {
                            cid=course['id'];
                            remarks=course['remarks']

                        } else {
                            cid = lesson['id'];

                        }
                        if (lesson['changes']) {

                            const les = {

                                id: cid,
                                title: '',
                                start: start,
                                end: end,
                                allDay: false,
                                extendedProps: {
                                    titel: lesson['subjectCode'],
                                    klassen: lesson['classCodes'] ? lesson['classCodes'].join(', ') : "",
                                    lehrer: lesson['teacherCodes'] ? lesson['teacherCodes'].join(', ') : "",
                                    raeume: lesson['roomCodes'] ? lesson['roomCodes'].join(', ') : "",
                                    bemerkungen: remarks,
                                    changes: lesson['changes'] || null
                                }
                            };
                            CALENDAR.addEvent(les);
                        } else {
                            const les = {
                                id: cid,
                                title: '',
                                start: start,
                                end: end,
                                allDay: false,
                                extendedProps: {
                                    titel: lesson['subjectCode'],
                                    klassen: lesson['classCodes'] ? lesson['classCodes'].join(', ') : "",
                                    lehrer: lesson['teacherCodes'] ? lesson['teacherCodes'].join(', ') : "",
                                    raeume: lesson['roomCodes'] ? lesson['roomCodes'].join(', ') : "",
                                    bemerkungen: remarks,
                                }
                            };
                            CALENDAR.addEvent(les);
                            //console.log(les);
                        }

                    }

                    //console.log(lesson)
                }

            }
        }
    }

}


function load_student_lessons() {
    CALENDAR.removeAllEvents();
    //console.clear();

    if (target_student_ref === "") return;

    for (let course of STUNDENPLAN["result"]["courses"]) {
        if (!course['studentRefs'] || !course['studentRefs'].includes(target_student_ref)) continue;

        for (let lesson of STUNDENPLAN["result"]["displaySchedule"]["lessonTimes"]) {

            if (lesson['courseRef'] !== course['id']) {
                continue;
            }

            for (let date of lesson['dates']) {
                const {start, end} = convertToISODate(date, lesson['startTime'], lesson['endTime']);

                const les = {
                    id: course['id'], title: '', start: start, end: end, allDay: false, extendedProps: {
                        titel: lesson['subjectCode'],
                        klassen: lesson['classCodes'].join(', '),
                        lehrer: lesson['teacherCodes'].join(', '),
                        raeume: lesson['roomCodes'].join(', '),
                        bemerkungen: course['remarks'],
                        changes: lesson['changes'] || null
                    }
                };
                CALENDAR.addEvent(les);
            }
        }
    }
}


function reloadTimetableFile() {
    let IservAuthSession = getCookie("mod_auth_openidc_session")
    console.log(IservAuthSession)
    //let IservAuthSession = localStorage.getItem("IservAuthSession")

    if (IservAuthSession !== "") {
        console.log("Session token existing")
        fetch_timetable(IservAuthSession).then(() => {
            populate_select();
            load_student_lessons();
        })
    } else {
        fetch_key().then(() => {
            populate_select();
            load_student_lessons();
        })
    }
}

function getAenderungProperty(changes, prop) {
    let value = "";
    if (changes[prop]) {
        value = changes[prop];
    }
    //console.log(changes[prop].length);
    return value;
}


function fetch_key() {
    return new Promise((resolve, reject) => {
        fetch(server+"auth?username="+username+"&password="+password)
            .then(response => {
                if (!response.ok) {
                    console.warn("Session invalid, trying to refresh");
                }
                return response.json();
            })
            .then(data => {
                console.log("KEY"+data)
                //localStorage.setItem('IservAuthSession', data);
                document.cookie = "mod_auth_openidc_session="+data;
                fetch_timetable(data).then(() => resolve()); // Wait for timetable fetch
            })
            .catch(error => {
                reject(error);
            });
    });
}

function fetch_timetable(key) {
    return new Promise((resolve, reject) => {
        fetch(server + "json?key=" + key)
            .then(response => {
                if (!response.ok) {
                    console.warn("Session invalid, trying to refresh");
                    fetch_key().then(() => reloadTimetableFile());

                }
                return response.json();
            })
            .then(data => {
                console.log("Session token valid");
                STUNDENPLAN = data;
                resolve(data);
            })
            .catch(error => {
                reject(error);
            });
    });
}

function fetch_json() {
    let IservAuthSession = localStorage.getItem("IservAuthSession")

    if (IservAuthSession !==null) {
        fetch_timetable(IservAuthSession);
    } else {
        fetch_key();
    }
}

function convertToISODate(date, startTime, endTime) {
    // Split date into year, month, and day
    const year = date.substring(0, 4);
    const month = date.substring(4, 6);
    const day = date.substring(6);

    // Split start time into hours and minutes
    const startHours = startTime.substring(0, 2);
    const startMinutes = startTime.substring(2);

    // Construct start date string
    const startDateString = `${year}-${month}-${day}T${startHours}:${startMinutes}:00`;

    // Split end time into hours and minutes
    const endHours = endTime.substring(0, 2);
    const endMinutes = endTime.substring(2);

    // Construct end date string
    const endDateString = `${year}-${month}-${day}T${endHours}:${endMinutes}:00`;

    return {start: startDateString, end: endDateString};
}

function formatDate(dateString) {
    const months = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'];
    const weekdays = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];

    const year = dateString.slice(0, 4);
    const monthIndex = parseInt(dateString.slice(4, 6), 10) - 1;
    const day = dateString.slice(6, 8);
    const hour = dateString.slice(9, 11);
    const minute = dateString.slice(11, 13);

    const date = new Date(year, monthIndex, day, hour, minute);
    const dayOfWeek = weekdays[date.getDay()];
    const month = months[monthIndex];

    return `${dayOfWeek}, ${day}. ${month} ${hour}:${minute}`;
}

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

//console.log(getCookie("mod_auth_openidc_session"));

/*
function load_student_lessons() {
    //wonderful nested code
    CALENDAR.removeAllEvents();
    console.clear();
    console.log(target_student_ref)
    if (target_student_ref!=="") {
        for (let course of STUNDENPLAN["result"]["courses"]) {
            if (course['studentRefs']) {
                if (course['studentRefs'].includes(target_student_ref)) {
                    //console.log(course);
                    for (let lesson of STUNDENPLAN["result"]["displaySchedule"]["lessonTimes"]) {
                        if (lesson['courseRef'] === course['id']) {
                            //Why implement changeType if its always 0 ._.
                            for (let date of lesson['dates']) {
                                const {start, end} = convertToISODate(date, lesson['startTime'], lesson['endTime']);
                                //console.log("Start:", start);
                                //console.log("End:", end);
                                if (lesson['changes']) {

                                    const les = {
                                        id: course['id'],
                                        title: '',
                                        start: start,
                                        end: end,
                                        allDay: false,
                                        extendedProps: {
                                            titel: lesson['subjectCode'],
                                            klassen: lesson['classCodes'].join(', '),
                                            lehrer: lesson['teacherCodes'].join(', '),
                                            raeume: lesson['roomCodes'].join(', '),
                                            bemerkungen: course['remarks'],
                                            changes: lesson['changes']
                                        }
                                    };
                                    CALENDAR.addEvent(les);
                                } else {
                                    const les = {
                                        id: course['id'],
                                        title: '',
                                        start: start,
                                        end: end,
                                        allDay: false,
                                        extendedProps: {
                                            titel: lesson['subjectCode'],
                                            klassen: lesson['classCodes'].join(', '),
                                            lehrer: lesson['teacherCodes'].join(', '),
                                            raeume: lesson['roomCodes'].join(', '),
                                            bemerkungen: course['remarks'],
                                        }
                                    };
                                    CALENDAR.addEvent(les);
                                    //console.log(les);
                                }

                            }

                            //console.log(lesson)
                        }
                    }
                }
            }
        }
        console.log(STUNDENPLAN);
    }

}

 */