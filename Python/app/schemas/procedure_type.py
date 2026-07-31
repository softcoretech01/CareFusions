from pydantic import BaseModel

class ProcedureTypeResponse(BaseModel):
    id: int
    typeName: str
