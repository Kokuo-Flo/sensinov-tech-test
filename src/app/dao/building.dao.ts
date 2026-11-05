import { Injectable } from '@angular/core';
import { type Observable, of, throwError } from 'rxjs';

import { BUILDINGS, findBuilding } from '#data/building.data';
import { findBuildingEquipments } from '#data/equipment.data';
import { type Building } from '#models/building.model';
import { type Equipment } from '#models/equipment.model';
import { notFound } from '#utils/data-problem.utils';

@Injectable({ providedIn: 'root' })
export class BuildingDao {
  public getAll(): Observable<Building[]> {
    return of([...BUILDINGS]);
  }

  public getById(buildingId: string): Observable<Building> {
    const building = findBuilding(buildingId);
    if (building === null) {
      return throwError(() => notFound('Building', buildingId));
    }
    return of(building);
  }

  public getEquipments(buildingId: string): Observable<Equipment[]> {
    if (findBuilding(buildingId) === null) {
      return throwError(() => notFound('Building', buildingId));
    }
    return of(findBuildingEquipments(buildingId));
  }
}
