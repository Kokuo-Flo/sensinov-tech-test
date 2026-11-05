---
paths:
  - 'src/**/*.dao.ts'
---

# DAO rules

## Role

A DAO owns the HTTP layer of one backend resource: URL building, raw call, response typing. No business logic, no state, no signals, no `subscribe()`.

## Skeleton

```typescript
@Injectable({ providedIn: 'root' })
export class BuildingDao {
  // --- Injections ---
  private readonly _http = inject(HttpClient);

  // --- Constants ---
  private readonly _baseUrl = `${API_BASE_URL}/buildings`;

  public getAll(): Observable<Building[]> {
    return this._http.get<Building[]>(this._baseUrl);
  }

  public getById(buildingId: string): Observable<Building> {
    return this._http.get<Building>(`${this._baseUrl}/${buildingId}`);
  }
}
```

## Rules

- Every method returns `Observable<T>` — the bare payload. There is no response envelope: success/failure is the HTTP status.
- Errors are **not** caught in the DAO: the `HttpErrorResponse` (Problem Details body) propagates to the service, which normalizes it with `toApiProblem()`.
- URLs are built from `API_BASE_URL` (`#models/api.model`) — never a hardcoded host.
- Query parameters through `HttpParams` / the `params` option, never string concatenation.
- Only `HttpClient` is injected.
- Mapping to domain types beyond typing the payload (aggregation, unit conversion) belongs to the service.
