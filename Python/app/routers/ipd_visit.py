from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.schemas.ipd_visit import IpdClinicalSaveRequest
import json

router = APIRouter(prefix="/ipd-visits", tags=["ipd-visits"])

@router.get("/schedule")
def get_ipd_schedule(db: Session = Depends(get_db)):
    conn = db.connection().connection
    import pymysql
    cursor = conn.cursor(pymysql.cursors.DictCursor)
    
    try:
        cursor.execute("""
            CALL hospital.SpIpdClinicalOperations(
                'GET_SCHEDULE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
                NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
            )
        """)
        results = cursor.fetchall()
        while cursor.nextset(): pass
        
        visits = []
        for row in results:
            visits.append({
                "admissionId": row.get("AdmissionId"),
                "appointmentId": row.get("AdmissionId"),
                "admissionNumber": row.get("AdmissionNumber"),
                "uhid": row.get("Uhid"),
                "patientName": row.get("PatientName"),
                "age": row.get("Age"),
                "gender": row.get("Gender"),
                "admissionDate": row.get("AdmissionDate"),
                "doctorName": row.get("AdmittingDoctor"),
                "department": row.get("Specialty"),
                "status": row.get("Status"),
                "billingStatus": "Pending" 
            })
        return visits
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()

@router.get("/{admission_id}/details")
def get_ipd_visit_details(admission_id: int, db: Session = Depends(get_db)):
    conn = db.connection().connection
    import pymysql
    cursor = conn.cursor(pymysql.cursors.DictCursor)
    
    try:
        cursor.execute("""
            CALL hospital.SpIpdClinicalOperations(
                'GET_DETAILS', %s, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
                NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
            )
        """, (admission_id,))
        
        result_sets = []
        has_next = True
        while has_next:
            result_sets.append(cursor.fetchall())
            has_next = cursor.nextset()
            
        if not result_sets or not result_sets[0]:
            raise HTTPException(status_code=404, detail="Visit details not found")
            
        if len(result_sets) == 1 and len(result_sets[0]) == 0:
            return {"status": "NOT_FOUND"}
            
        # Parse JSON for administrations
        medications = result_sets[3] if len(result_sets) > 3 else []
        for med in medications:
            if med.get("Administrations") and isinstance(med["Administrations"], str):
                try:
                    med["Administrations"] = json.loads(med["Administrations"])
                except:
                    pass

        data = {
            "admissionInfo": result_sets[0][0] if len(result_sets[0]) > 0 else None,
            "vitals": result_sets[1] if len(result_sets) > 1 else [],
            "rounds": result_sets[2] if len(result_sets) > 2 else [],
            "medications": medications,
            "investigations": result_sets[4] if len(result_sets) > 4 else []
        }
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()

@router.post("/save-clinical")
def save_ipd_clinical(request: IpdClinicalSaveRequest, db: Session = Depends(get_db)):
    conn = db.connection().connection
    import pymysql
    cursor = conn.cursor(pymysql.cursors.DictCursor)
    
    try:
        if request.vitals:
            cursor.execute("""
                CALL hospital.SpIpdClinicalOperations(
                    'SAVE_VITALS', %s, %s, %s, %s, %s, %s, %s, NULL, NULL,
                    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
                )
            """, (
                request.admissionId, request.vitals.temperature, request.vitals.pulse,
                request.vitals.bloodPressure, request.vitals.respiratoryRate,
                request.vitals.spO2, request.vitals.notes
            ))
            
        if request.round:
            cursor.execute("""
                CALL hospital.SpIpdClinicalOperations(
                    'SAVE_ROUND', %s, NULL, NULL, NULL, NULL, NULL, NULL, %s, %s,
                    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
                )
            """, (
                request.admissionId, request.round.doctorName, request.round.note
            ))
            
        if request.medication:
            administrations_json = None
            if request.medication.administrations:
                administrations_json = json.dumps(request.medication.administrations)
                
            if request.medication.medicineId and request.medication.administrations is not None:
                cursor.execute("""
                    CALL hospital.SpIpdClinicalOperations(
                        'UPDATE_MEDICATION_ADMIN', %s, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
                        NULL, NULL, NULL, NULL, %s, NULL, NULL, NULL, NULL, %s
                    )
                """, (
                    request.admissionId, administrations_json, request.medication.medicineId
                ))
            else:
                cursor.execute("""
                    CALL hospital.SpIpdClinicalOperations(
                        'SAVE_MEDICATION', %s, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
                        %s, %s, %s, %s, %s, NULL, NULL, NULL, NULL, %s
                    )
                """, (
                    request.admissionId, request.medication.medicineName, request.medication.dosage,
                    request.medication.frequency, request.medication.route, administrations_json,
                    request.medication.medicineId
                ))
            
        if request.investigation:
            cursor.execute("""
                CALL hospital.SpIpdClinicalOperations(
                    'SAVE_INVESTIGATION', %s, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
                    NULL, NULL, NULL, NULL, NULL, %s, %s, %s, %s, NULL
                )
            """, (
                request.admissionId, request.investigation.testName, request.investigation.result,
                request.investigation.normalRange, request.investigation.status
            ))
            
        while cursor.nextset(): pass
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()

