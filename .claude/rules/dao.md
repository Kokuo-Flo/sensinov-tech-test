---
paths:
  - 'src/**/*.dao.ts'
---

# DAO rules

## Role

A DAO is the **single seam** between the app and its data source — today the in-memory dataset (`#data/*`). It looks entities up and returns them typed. No business logic, no state, no signals, no `subscribe()`. To plug a real API one day, only the DAOs change.

## Skeleton

```typescript
@Injectable({ providedIn: 'root' })
export class BuildingDao {
  public getAll(): Observable<readonly Building[]> {
    return of(BUILDINGS);
  }

  public getById(buildingId: string): Observable<Building> {
    const building = findBuilding(buildingId);
    return building === null ? throwError(() => notFound('Building', buildingId)) : of(building);
  }
}
```

## Rules

- Every method returns `Observable<T>`, so services keep the same `rxResource()` code whatever the source.
- A failure is a thrown `DataProblemError` (`notFound(…)`, `invalidMetric(…)` factories from `#utils/data-problem.utils`), never `null` or a sentinel value. Errors are not caught in the DAO: the service normalizes them with `toDataProblem()`.
- DAOs are the only files importing `#data/*`.
- Mapping to domain types beyond lookup and range selection (aggregation, unit conversion) belongs to a service or util.
