const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Student = require("../model/studentSchema");
const bcrypt = require("bcrypt");
const Parent = require("../model/parentSchema"); // Ensure consistent naming
const Notification = require("../model/notificationSchema");
const jwt=require("jsonwebtoken");
const Assignment = require("../model/assignmentSchema");
const Teacher = require("../model/teacherSchema");
const nodemailer = require("nodemailer");

const studentController = {
    register: asyncHandler(async (req, res) => {
        const { email, password, name, profile_image, classes, division, roll_number, dob, parent_id,secondary_phone,address,place,post_code,blood_group,state,country,natonality } = req.body;

        if (!email || !password || !name || !profile_image || !classes || !division || !roll_number || !dob || !parent_id) {
            return res.status(400).json({ message: "Incomplete data" });
        }

        if (!mongoose.Types.ObjectId.isValid(parent_id)) {
            return res.status(400).json({ message: "Invalid parent_id format" });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newStudent = await Student.create({
            email,
            password: hashedPassword,
            name,
            profile_image,
            classes,
            division,
            roll_number,
            dob,
            parent_id: new mongoose.Types.ObjectId(parent_id),
            secondary_phone,address,place,post_code,blood_group,state,country,natonality 
        });

        if (!newStudent) {
            return res.status(500).json({ message: "Registration failed" });
        }

        res.status(201).json({ message: "Registration successful", student: newStudent });
    }),

    addParent: asyncHandler(async (req, res) => {
        const { name, email, phone, address } = req.body;

       
        const existingParent = await Parent.findOne({ email });
        if (existingParent) {
            return res.status(400).json({ message: "Parent already exists" });
        }

        const newParent = await Parent.create({
            name,
            email,
            phone,
            address
        });

        if (!newParent) {
            return res.status(500).json({ message: "Failed to add parent" });
        }

        res.status(201).json({ message: "Parent added successfully", parent: newParent });
    }),
    dashBoard :asyncHandler(async (req, res) => {
        const { id, email } = req.user;
        console.log(req.user);
    
        try {
            const studentDetails = await Student.findOne({ email }); // Use findOne for a single student
    
            if (!studentDetails) {
                return res.status(404).json({ message: "Student not found" });
            }
    
            const notifications = await Notification.find({ user_id: id }); // Use find

            res.status(200).json({  // Send a JSON response
                student: studentDetails,
                notifications: notifications, // Or userNotification if you kept that variable
            });
    
        } catch (error) {
            console.error("Dashboard error:", error);
            res.status(500).json({ message: "Server error" });
        }
    }),
    insertNotification: asyncHandler(async (req, res) => {
        const { user_id, title, message, type } = req.body;

        if (!user_id || !title || !message) {
            return res.status(400).json({ message: "Incomplete data" });
        }
        
        try {
            const newNotification = await Notification.create({
                user_id,
                title,
                message,
                type: type || "info" // Default type is "info"
            });


            res.status(201).json({ message: "Notification added successfully", notification: newNotification });
        } catch (error) {
            res.status(500).json({ message: "Failed to add notification", error: error.message });
        }
    }),
    login:asyncHandler(async(req,res)=>{
        const {email,password}=req.body
        if(!email||!password){throw new Error("incomeplete data")}
        console.log(email,password);
        
        const UserDetails=await Student.findOne({email})
        if(!UserDetails){throw new Error("User not found")}
        const hashedPassword= await UserDetails.password
        
        const compare=await bcrypt.compare(password,hashedPassword)
        if(!compare){throw new Error("Invalid email or password")}

        const payload={
            email,
            id:UserDetails._id
        }
        const token=jwt.sign(payload,process.env.SECRET_KEY)
        res.cookie("token",token,{
            httpOnly:true,
            maxage:1*24*60*60*1000
        })

        res.status(200).send("login is successful")
    }),
    profile:asyncHandler(async(req,res)=>{
        const {id}=req.user
        console.log(req.user);
        
        if(!id){throw new Error("Incomplete data")}
        const userDetails=await Student.findOne({_id:id})
        if(!userDetails){throw new Error("User not found")}

        res.status(200).send(userDetails)
    }),
    
    

    
     addAssignment : asyncHandler(async (req, res) => {
      const { title, dueDate, description, assignedBy, classes, division, subject, gradeLevel, instructions, resources } = req.body;  // Include new fields
    
      
      if (!title || !dueDate || !assignedBy || !classes || !division) {
        res.status(400); 
        throw new Error('Please provide all required fields: title, dueDate, assignedBy, classes, and division.');
      }
    
      const insertAssignment = await Assignment.create({
        title,
        dueDate,
        description,
        assignedBy,
        classes,
        division,
        subject,
        gradeLevel,
        instructions,
        resources,
      });
    
      if (!insertAssignment) {
        res.status(500); 
        throw new Error("Failed to create assignment."); 
      }
    
      res.status(201).json(insertAssignment); 
    }),
    getAssignments: asyncHandler(async (req, res) => {
        try {
            const studentId = req.user.id; 
            console.log(studentId);
           
            // Convert studentId to ObjectId
            if (!mongoose.Types.ObjectId.isValid(studentId)) {
                res.status(400);
                throw new Error('Invalid student ID');
            }
            
            const student = await Student.findOne({ _id: new mongoose.Types.ObjectId(studentId) });
            if (!student) {
                res.status(404);
                throw new Error('Student not found');
            }
    
            console.log(student.classes);
    
            const assignments = await Assignment.find({ classes: student.classes });
            console.log(assignments);
    
            if (!assignments || assignments.length === 0) {
                res.status(404);
                throw new Error('No assignments found for your class');
            }
    
            res.status(200).json(assignments);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }),
    createTeacher: asyncHandler(async (req, res) => {
        const { name, subjects, department, classes } = req.body;
    
        if (!name || !subjects || subjects.length === 0) {
            res.status(400);
            throw new Error('Please provide name and at least one subject');
        }
    
        const newTeacher = await Teacher.create({
            name,
            subjects: Array.isArray(subjects) ? subjects : [subjects], // Ensure it's an array
            classes,
            department
        });
    
        res.status(201).json(newTeacher);
    }),
    
      getTeachersByClass : asyncHandler(async (req, res) => {
        const { id } = req.user;
    
        // Find student by ID
        const findStudent = await Student.findOne({ _id: id });
        if (!findStudent) {
            throw new Error("Student not found");
        }
    
        // Get student's class
        const studentClass = findStudent.classes;
    
        // Find teachers associated with the class
        const teachers = await Teacher.find({ classes: studentClass });
    
        if (!teachers || teachers.length === 0) {
            throw new Error("No teachers found for this class.");
        }
    
        console.log("Fetched Teachers:", teachers); // Debugging log
    
        // Group teachers by subject
        const teachersBySubject = {};
    
        teachers.forEach(teacher => {
            if (!teacher.subjects) {
                console.warn(`Teacher ${teacher.name} has no subjects field.`);
                return; // Skip this teacher
            }
    
            if (!Array.isArray(teacher.subjects)) {
                console.warn(`Teacher ${teacher.name} has an invalid subjects format.`);
                return; // Skip this teacher
            }
    
            teacher.subjects.forEach(subject => {
                if (!teachersBySubject[subject]) {
                    teachersBySubject[subject] = [];
                }
                teachersBySubject[subject].push(teacher);
            });
        });
    
        console.log("Grouped Teachers by Subject:", teachersBySubject); // Debugging log
    
        res.status(200).json(teachersBySubject);
    }),
    calender: asyncHandler(async (req, res) => {
        const { id } = req.user;
        if (!id) {
            throw new Error("User is not logged in");
        }
    
        const student = await Student.findOne({ _id: id });
        if (!student) {
            throw new Error("Student not found");
        }
    
        const classStudent = student.classes;
    
        const assignments = await Assignment.find({ classes: classStudent });
    
        if (!assignments || assignments.length === 0) {
            throw new Error("No assignments found");
        }
    
        console.log(assignments);
    
        // Extract separate date and time
        const formattedDates = assignments.map((assignment) => {
            const dateObj = new Date(assignment.dueDate);
            return {
                date: dateObj.toISOString().split("T")[0], // YYYY-MM-DD
                time: dateObj.toTimeString().split(" ")[0] // HH:MM:SS
            };
        });
    
        console.log(formattedDates);
        res.status(200).json(formattedDates);
    }) ,
     forgotPassword :asyncHandler(async (req, res) => {
        try {
            console.log("🔹 Forgot Password Request Received");
    
            const { email } = req.body;
            console.log(`📧 Email Received: ${email}`);
    
            if (!email) {
                console.error("❌ Error: Email is missing from request");
                return res.status(400).json({ error: "Email is required" });
            }
    
            // Find student by email
            const user = await Student.findOne({ email }).lean(); // Use .lean() for better performance
            if (!user) {
                console.error(`❌ Error: No user found with email ${email}`);
                return res.status(404).json({ error: "User not found" });
            }
    
            console.log(`✅ User Found: ${user.email}`);
    
            // Generate Reset Token (Valid for 1 hour)
            let resetToken;
            try {
                resetToken = jwt.sign({ id: user._id }, process.env.SECRET_KEY, { expiresIn: "1h" });
                console.log("🔑 Reset Token Generated Successfully");
            } catch (jwtError) {
                console.error("❌ JWT Token Generation Error:", jwtError.message);
                return res.status(500).json({ error: "Failed to generate reset token" });
            }
    
            // Construct Reset URL
            const resetUrl = `http://localhost:5000/api/v1/student/reset-password/${resetToken}`;
            console.log(`🔗 Reset URL: ${resetUrl}`);
    
            // Configure Nodemailer Transporter
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });
    
            console.log("📨 Nodemailer Transporter Configured");
    
            // Email Content
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: "Password Reset Request",
                text: `Click the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour.`,
            };
    
            console.log("📬 Sending Email...");
    
            // Send Email
            try {
                await transporter.sendMail(mailOptions);
                console.log("✅ Email Sent Successfully!");
            } catch (emailError) {
                console.error("❌ Error Sending Email:", emailError.message);
                return res.status(500).json({ error: "Failed to send reset email" });
            }
    
            return res.status(200).json({ message: "Password reset email sent successfully" });
    
        } catch (error) {
            console.error("❌ General Error:", error);
            return res.status(500).json({ error: error.toString() });
        }
    }),
    
    // ────────────────────────────────────────────────────────────
    // RESET PASSWORD FUNCTION
    // ────────────────────────────────────────────────────────────
     resetPassword :asyncHandler(async (req, res) => {
        try {
            console.log("🔹 Reset Password Request Received");
    
            const { token } = req.query; // Use req.query if the token is passed as a query parameter
 // Changed from req.query to req.params
            const { newPassword } = req.body;
    
            if (!token) {
                console.error("❌ Error: Reset token is missing");
                return res.status(400).json({ error: "Reset token is required" });
            }
    
            if (!newPassword) {
                console.error("❌ Error: New password is missing");
                return res.status(400).json({ error: "New password is required" });
            }
    
            let decoded;
            try {
                decoded = jwt.verify(token, process.env.SECRET_KEY);
                console.log("🔑 Token Verified Successfully");
            } catch (err) {
                console.error("❌ Error: Invalid or expired token..........");
                return res.status(400).json({ error: "Invalid or expired token" });
            }
    
            // Find user by ID
            const user = await Student.findById(decoded.id);
            if (!user) {
                console.error("❌ Error: No user found");
                return res.status(404).json({ error: "User not found" });
            }
    
            // Hash the new password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            user.password = hashedPassword;
            
            // Save new password
            await user.save();
            console.log("✅ Password Reset Successfully!");
    
            return res.status(200).json({ message: "Password reset successfully!" });
    
        } catch (error) {
            console.error("❌ General Error:", error);
            return res.status(500).json({ error: error.toString() });
        }
    })

};

module.exports = studentController;
