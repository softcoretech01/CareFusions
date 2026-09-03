ALTER TABLE admin.Master_DoctorProfessional_Detail DROP FOREIGN KEY `1`;
ALTER TABLE admin.Master_DoctorProfessional_Detail ADD CONSTRAINT `fk_prof_doctor` FOREIGN KEY (`DoctorId`) REFERENCES admin.Master_Doctor_Header(`DoctorId`) ON DELETE CASCADE;

ALTER TABLE admin.Master_DoctorConsultation_Detail DROP FOREIGN KEY `1`;
ALTER TABLE admin.Master_DoctorConsultation_Detail ADD CONSTRAINT `fk_cons_doctor` FOREIGN KEY (`DoctorId`) REFERENCES admin.Master_Doctor_Header(`DoctorId`) ON DELETE CASCADE;

ALTER TABLE admin.Master_DoctorSchedule_Detail DROP FOREIGN KEY `1`;
ALTER TABLE admin.Master_DoctorSchedule_Detail ADD CONSTRAINT `fk_sch_doctor` FOREIGN KEY (`DoctorId`) REFERENCES admin.Master_Doctor_Header(`DoctorId`) ON DELETE CASCADE;

ALTER TABLE admin.Master_DoctorDocument_Detail DROP FOREIGN KEY `1`;
ALTER TABLE admin.Master_DoctorDocument_Detail ADD CONSTRAINT `fk_doc_doctor` FOREIGN KEY (`DoctorId`) REFERENCES admin.Master_Doctor_Header(`DoctorId`) ON DELETE CASCADE;
