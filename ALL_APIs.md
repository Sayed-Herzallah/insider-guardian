# API Reference Documentation

## Base Configuration


REST Base URL:  http://192.168.100.9:8000/api/v1
WebSocket URL:  ws://192.168.100.9:8000/ws/dashboard/?token=<access_token>

Every REST request needs this header (except login):
  Authorization: Bearer <access_token>
  Content-Type: application/json

===========================================================================
AUTH ENDPOINTS
===========================================================================

POST   /auth/login/
  Body:     { "email": "admin@ig.com", "password": "Admin1234!" }
  Response: { "success": true, "data": { "access": "...", "refresh": "..." } }
  Notes:    Field is EMAIL not username

POST   /auth/logout/
  Body:     { "refresh": "<refresh_token>" }
  Response: { "success": true, "message": "Logged out successfully." }

POST   /auth/token/refresh/
  Body:     { "refresh": "<refresh_token>" }
  Response: { "access": "new_token", "refresh": "new_refresh_token" }
  Notes:    Call this when any request returns 401

GET    /auth/profile/
  Response: { "data": { "id", "email", "first_name", "last_name",
                        "full_name", "role", "permissions", "last_login_ip",
                        "last_login", "created_at" } }

PATCH  /auth/profile/
  Body:     { "first_name": "...", "last_name": "..." }
  Response: { "success": true, "data": { ...updated user... } }

POST   /auth/change-password/
  Body:     { "old_password": "...", "new_password": "...", "new_password_confirm": "..." }
  Response: { "success": true, "message": "Password changed successfully." }

GET    /auth/roles/
  Response: { "data": [ { "role": "admin", "label": "Admin", "permissions": [...] } ] }

GET    /auth/sessions/
  Response: { "data": [ { "id", "ip_address", "user_agent", "last_used_at", "created_at" } ] }

DELETE /auth/sessions/<session_id>/
  Response: { "success": true, "message": "Session revoked." }

===========================================================================
USERS ENDPOINTS  (admin only)
===========================================================================

GET    /users/
  Query:    ?role=analyst &is_active=true &search=john
  Response: { "data": [ { "id", "email", "first_name", "last_name",
                          "full_name", "role", "is_active", "last_login",
                          "created_at" } ], "meta": { "count": 10 } }

POST   /users/
  Body:     { "email": "...", "first_name": "...", "last_name": "...",
              "role": "analyst", "password": "...", "password_confirm": "..." }
  Response: { "success": true, "data": { ...new user... } }

GET    /users/<user_id>/
  Response: { "data": { ...full user... } }

PATCH  /users/<user_id>/
  Body:     { "role": "senior_analyst", "is_active": true }
  Response: { "success": true, "data": { ...updated user... } }

DELETE /users/<user_id>/
  Response: { "success": true, "message": "User deactivated." }
  Notes:    Soft delete — sets is_active=false, data is kept

===========================================================================
AGENTS ENDPOINTS
===========================================================================

GET    /agents/
  Query:    ?status=online &tag=servers &search=DC-01
  Response: { "data": [ { "id", "name", "hostname", "ip_address", "os_type",
                          "os_version", "status", "last_seen", "is_active",
                          "tag_names", "created_at" } ],
              "meta": { "count": 12 } }

POST   /agents/
  Body:     { "name": "VM-Test-Agent", "description": "..." }
  Response: { "data": { ...agent... , "api_key": "64-char-hex",
                        "api_key_warning": "Store this key securely..." } }
  Notes:    api_key shown ONCE — display in modal with copy button

GET    /agents/stats/
  Response: { "data": { "total": 12, "online": 9, "offline": 3, "reconnecting": 0 } }

GET    /agents/tags/
  Response: { "data": [ { "id", "name", "description", "color" } ] }

POST   /agents/tags/
  Body:     { "name": "critical-servers", "description": "...", "color": "#ef4444" }

GET    /agents/<agent_id>/
  Response: { "data": { "id", "name", "description", "hostname", "ip_address",
                        "os_type", "os_version", "agent_version", "architecture",
                        "status", "last_seen", "connected_at", "is_active",
                        "tags", "registered_by", "created_at", "updated_at" } }

PATCH  /agents/<agent_id>/
  Body:     { "name": "...", "description": "...", "is_active": true }

DELETE /agents/<agent_id>/
  Response: { "success": true, "message": "Agent deactivated." }

POST   /agents/<agent_id>/rotate-key/
  Response: { "data": { "agent_id": "...", "api_key": "new-64-char-hex",
                        "api_key_warning": "..." } }
  Notes:    Show new key in modal with copy button + warning

GET    /agents/<agent_id>/events/
  Response: { "data": [ { "id", "event_type", "detail", "ip_address", "created_at" } ] }

===========================================================================
ALERTS ENDPOINTS
===========================================================================

GET    /alerts/
  Query:    ?status=new &severity=critical &alert_type=malware_detected
            &agent_id=<uuid> &mitre_technique_id=T1059 &search=powershell
            &from_date=2024-01-15T00:00:00Z &to_date=2024-01-15T23:59:59Z
            &unlinked=true &page=2
  Response: { "data": [ { "id", "alert_type", "severity", "status", "title",
                          "agent_id", "agent_name", "agent_hostname",
                          "mitre_technique_id", "mitre_technique_name",
                          "mitre_tactic_names", "is_duplicate", "incident_id",
                          "reviewed_by_email", "detected_at", "created_at" } ],
              "meta": { "count": 24 } }

GET    /alerts/stats/
  Response: { "data": { "by_status": { "new": 24, "under_review": 5 },
                        "by_severity": { "critical": 3, "high": 8 },
                        "total_new": 24, "total_critical": 3 } }

GET    /alerts/<alert_id>/
  Response: { "data": { ...all list fields plus...
                        "description", "process_name", "process_id",
                        "process_path", "parent_process_name", "command_line",
                        "user_account", "file_path", "file_hash",
                        "source_ip", "source_port", "destination_ip",
                        "destination_port", "protocol",
                        "mitre_context": { "technique_id", "technique_name",
                                           "tactic_names", "detection", "url" },
                        "analyst_notes", "reviewed_by_email", "reviewed_at",
                        "raw_data", "updated_at" } }

PATCH  /alerts/<alert_id>/status/
  Body:     { "status": "under_review", "analyst_notes": "Investigating..." }
  Valid status values: under_review / escalated / false_positive / resolved
  Response: { "success": true, "data": { ...updated alert... } }

===========================================================================
INCIDENTS ENDPOINTS
===========================================================================

GET    /incidents/
  Query:    ?status=open &severity=critical &assigned_to_me=true &search=ransomware
  Response: { "data": [ { "id", "incident_id", "title", "status", "severity",
                          "assigned_to_email", "created_by_email", "alert_count",
                          "mitre_technique_ids", "mitre_tactic_names",
                          "first_seen", "last_seen", "created_at", "updated_at" } ] }

POST   /incidents/
  Body:     { "title": "...", "description": "...", "severity": "critical",
              "alert_ids": ["uuid1", "uuid2"], "assigned_to_id": "analyst-uuid" }
  Response: { "success": true, "data": { ...full incident... } }

GET    /incidents/stats/
  Response: { "data": { "total_open": 4, "total_in_progress": 2,
                        "by_status": {...}, "by_severity": {...} } }

GET    /incidents/<incident_id>/
  Response: { "data": { ...all list fields plus...
                        "description", "severity_overridden",
                        "alerts": [ ...alert list... ],
                        "comments": [ ...comment list... ],
                        "allowed_transitions": ["in_progress", "false_positive"],
                        "affected_agent_names": ["DC-01", "WEB-01"],
                        "resolved_at", "resolution_summary", "updated_at" } }
  Notes:    Use allowed_transitions to decide which status buttons to show

PATCH  /incidents/<incident_id>/
  Body:     { "title": "...", "description": "...", "severity": "high" }

PATCH  /incidents/<incident_id>/status/
  Body:     { "status": "in_progress", "resolution_summary": "" }
  Notes:    Only use values from allowed_transitions field

POST   /incidents/<incident_id>/assign/
  Body:     { "analyst_id": "uuid" }   (null to unassign)
  Response: { "success": true, "data": { ...updated incident... } }

POST   /incidents/<incident_id>/alerts/
  Body:     { "alert_ids": ["uuid1", "uuid2"] }
  Response: { "success": true, "message": "2 alert(s) added to incident." }

DELETE /incidents/<incident_id>/alerts/<alert_id>/
  Response: { "success": true, "message": "Alert removed from incident." }

GET    /incidents/<incident_id>/comments/
  Response: { "data": [ { "id", "content", "is_internal",
                          "author_email", "author_name", "created_at" } ] }

POST   /incidents/<incident_id>/comments/
  Body:     { "content": "Confirmed malware...", "is_internal": false }
  Response: { "success": true, "data": { ...new comment... } }

GET    /incidents/<incident_id>/history/
  Response: { "data": [ { "id", "field_name", "old_value", "new_value",
                          "changed_by_email", "created_at" } ] }

===========================================================================
RESPONSE COMMANDS ENDPOINTS
===========================================================================

GET    /response/commands/
  Query:    ?agent_id=<uuid> &status=dispatched &command_type=kill_process
            &incident_id=<uuid>
  Response: { "data": [ { "id", "command_type", "status", "agent_id",
                          "agent_name", "issued_by_email", "reason",
                          "incident_id", "alert_id", "dispatched_at",
                          "completed_at", "duration_seconds", "created_at" } ] }

POST   /response/commands/
  Body:
  {
    "agent_id": "uuid",
    "command_type": "kill_process",
    "parameters": { "pid": 4772 },
    "reason": "Confirmed malicious process",
    "incident_id": "uuid",
    "alert_id": "uuid"
  }
  Response: { "success": true, "data": { ...command with status=dispatched... } }

  Command types and required parameters:
    kill_process           →  { "pid": <int> }
    delete_file            →  { "path": "<string>" }
    quarantine_file        →  { "path": "<string>" }
    block_ip               →  { "ip": "<string>" }
    unblock_ip             →  { "ip": "<string>" }
    block_domain           →  { "domain": "<string>" }
    kill_connections_by_ip →  { "ip": "<string>" }
    isolate_host           →  {}
    unisolate_host         →  {}
    reboot_machine         →  { "delay_seconds": <int> }  (optional)
    logoff_user            →  { "session_id": <int> }     (optional)

  Error responses:
    503 → agent offline:   { "error": { "code": "agent_offline", "message": "..." } }
    429 → queue full:      { "error": { "code": "agent_queue_full", "message": "..." } }

GET    /response/commands/stats/
  Response: { "data": { "pending": 0, "dispatched": 1, "completed": 87, ... } }

GET    /response/commands/<command_id>/
  Response: { "data": { ...all list fields plus...
                        "parameters", "output", "error_message", "exit_code",
                        "is_terminal", "acknowledged_at", "timeout_at", "updated_at" } }

POST   /response/commands/<command_id>/cancel/
  Response: { "success": true, "data": { ...command with status=cancelled... } }

===========================================================================
PLAYBOOKS ENDPOINTS
===========================================================================

GET    /playbooks/
  Query:    ?active_only=true &trigger=on_alert
  Response: { "data": [ { "id", "name", "description", "trigger",
                          "is_active", "stop_on_failure", "step_count",
                          "created_by_email", "created_at", "updated_at" } ] }

POST   /playbooks/
  Body:
  {
    "name": "Auto-isolate on critical malware",
    "description": "...",
    "trigger": "on_alert",
    "conditions": { "severity": ["critical"], "alert_type": ["malware_detected"] },
    "is_active": true,
    "stop_on_failure": true,
    "steps": [
      { "order": 1, "name": "Isolate host", "command_type": "isolate_host",
        "parameters": {}, "timeout_seconds": 30, "allow_failure": false },
      { "order": 2, "name": "Get processes", "command_type": "collect_telemetry",
        "parameters": { "telemetry_type": "process_list" },
        "timeout_seconds": 60, "allow_failure": true }
    ]
  }

  Trigger values:
    on_alert / on_incident_created / on_severity_change / manual / scheduled

GET    /playbooks/<playbook_id>/
  Response: { "data": { ...list fields plus "steps": [...], "conditions": {...} } }

PATCH  /playbooks/<playbook_id>/
  Body:     { "name": "...", "is_active": false, "stop_on_failure": true }

DELETE /playbooks/<playbook_id>/
  Response: { "success": true, "message": "Playbook deleted." }

POST   /playbooks/<playbook_id>/trigger/
  Body:     { "agent_id": "uuid" }
  Response: { "success": true, "data": { ...playbook run... } }

GET    /playbooks/<playbook_id>/runs/
  Response: { "data": [ { "id", "playbook_name", "status", "trigger_type",
                          "target_agent_name", "triggered_by_email",
                          "step_results": [...], "duration_seconds",
                          "started_at", "completed_at" } ] }

GET    /playbooks/runs/<run_id>/
  Response: { "data": { ...full run with all step results... } }

POST   /playbooks/<playbook_id>/steps/
  Body:     { "order": 3, "name": "Block IP", "command_type": "block_ip",
              "parameters": { "ip": "{{alert.source_ip}}" },
              "timeout_seconds": 30, "allow_failure": false }

DELETE /playbooks/<playbook_id>/steps/<step_id>/
  Response: { "success": true, "message": "Step removed." }

===========================================================================
TELEMETRY ENDPOINTS
===========================================================================

POST   /telemetry/requests/
  Body:     { "agent_id": "uuid", "telemetry_type": "process_list",
              "incident_id": "uuid" }
  Response: { "data": { "id", "telemetry_type", "status", "agent_id",
                        "agent_name", "created_at" } }

  Valid telemetry_type values:
    process_list / network_connections / open_files /
    logged_in_users / system_info / running_services

GET    /telemetry/requests/
  Query:    ?agent_id=<uuid> &telemetry_type=process_list &status=fulfilled
  Response: { "data": [ ...request list... ] }

GET    /telemetry/requests/<request_id>/
  Response: { "data": { "id", "telemetry_type", "status", "fulfilled_at",
                        "snapshot": { "data": [...], "record_count": 87,
                                      "expires_at": "..." } } }
  Notes:    Poll this every 2 seconds until status = "fulfilled"
            status values: pending / fulfilled / failed / timed_out

GET    /telemetry/snapshots/
  Query:    ?agent_id=<uuid> &telemetry_type=process_list &exclude_expired=true

GET    /telemetry/snapshots/<snapshot_id>/
  Response: { "data": { "telemetry_type", "data": [...], "record_count",
                        "expires_at", "collected_at", "created_at" } }

GET    /telemetry/agents/<agent_id>/latest/
  Response: { "data": {
    "process_list":        { "id", "record_count", "data": [...], "expires_at" },
    "network_connections": { "id", "record_count", "data": [...] },
    "system_info":         { "data": { "hostname", "os", "uptime_seconds", ... } },
    "logged_in_users":     null,
    "open_files":          null,
    "running_services":    null
  } }
  Notes:    null means no snapshot collected yet for that type

===========================================================================
DASHBOARD ENDPOINTS  (for charts and initial load)
===========================================================================

GET    /dashboard/stats/
  Response: { "data": {
    "agents":    { "total": 12, "online": 9, "offline": 3, "reconnecting": 0 },
    "alerts":    { "total_new": 24, "total_critical": 3,
                   "by_status":   { "new": 24, "under_review": 5, "resolved": 142 },
                   "by_severity": { "critical": 3, "high": 8, "medium": 13 },
                   "recent": [ { "id", "title", "severity", "alert_type",
                                 "agent__name", "created_at" } ] },
    "incidents": { "total_open": 4, "total_in_progress": 2,
                   "by_status": {...}, "by_severity": {...} },
    "commands":  { "by_status": { "pending": 0, "completed": 87 } },
    "generated_at": "2024-01-15T10:30:00Z"
  } }

GET    /dashboard/alerts/timeseries/?days=7
  Response: { "data": [
    { "date": "2024-01-09", "count": 12, "critical": 1 },
    { "date": "2024-01-10", "count": 8,  "critical": 0 }
  ] }

GET    /dashboard/mitre/top/?limit=10
  Response: { "data": [
    { "technique_id": "T1059.001", "name": "PowerShell", "count": 38 },
    { "technique_id": "T1486",     "name": "Data Encrypted for Impact", "count": 12 }
  ] }

GET    /dashboard/agents/activity/
  Response: { "data": [
    { "agent_id": "uuid", "agent_name": "DC-01", "count": 47 },
    { "agent_id": "uuid", "agent_name": "WEB-SERVER", "count": 31 }
  ] }

===========================================================================
MITRE ATT&CK ENDPOINTS  (read-only reference data)
===========================================================================

GET    /mitre/tactics/
  Response: { "data": [ { "tactic_id", "name", "short_name",
                          "description", "url" } ] }

GET    /mitre/techniques/
  Query:    ?tactic=TA0002 &platform=Windows &sub_techniques=false &search=powershell
  Response: { "data": [ { "technique_id", "name", "is_sub_technique",
                          "parent_id", "tactic_names", "platforms", "url" } ] }

GET    /mitre/techniques/<technique_id>/
  Example:  /mitre/techniques/T1059.001/
  Response: { "data": { "technique_id", "name", "description", "detection",
                        "platforms", "url", "is_sub_technique",
                        "parent": {...}, "sub_techniques": [...],
                        "tactics": [...], "tactic_names": [...] } }

GET    /mitre/groups/
  Query:    ?search=APT29
  Response: { "data": [ { "group_id", "name", "aliases",
                          "description", "url", "techniques": [...] } ] }

GET    /mitre/groups/<group_id>/
  Example:  /mitre/groups/G0016/

GET    /mitre/search/?q=powershell
  Response: { "data": {
    "tactics":    [ ...matching tactics... ],
    "techniques": [ ...matching techniques... ],
    "groups":     [ ...matching groups... ]
  } }

===========================================================================
AUDIT LOG ENDPOINTS
===========================================================================

GET    /audit/
  Query:    ?user_email=analyst@ig.com &action=command_issued
            &from_date=2024-01-15T00:00:00Z &to_date=2024-01-15T23:59:59Z
            &search=powershell
  Response: { "data": [ { "id", "user_id", "user_email", "user_role",
                          "action", "model_name", "object_id", "description",
                          "extra", "ip_address", "http_method", "http_path",
                          "http_status_code", "created_at" } ],
              "meta": { "count": 500, "capped_at": 1000 } }

GET    /audit/me/
  Response: { "data": [ ...same structure, last 200 entries for current user... ] }

GET    /audit/<log_id>/
  Response: { "data": { ...single audit log entry... } }

===========================================================================
WEBSOCKET — REAL-TIME MESSAGES
===========================================================================

Connect:
  ws://192.168.100.9:8000/ws/dashboard/?token=<access_token>

─── Messages RECEIVED from backend ─────────────────────────────────────────

type: "dashboard.stats"
  payload: {
    agents:    { total, online, offline, reconnecting },
    alerts:    { total_new, total_critical, by_status, by_severity, recent[] },
    incidents: { total_open, total_in_progress, by_status, by_severity },
    commands:  { by_status },
    generated_at: "ISO8601"
  }

type: "dashboard.alert"
  payload (new alert): {
    id, alert_type, severity, status, title,
    agent_id, agent_name,
    mitre_technique_id, mitre_technique_name, mitre_tactic_names,
    detected_at, created_at
  }
  payload (status change): {
    alert_id, status, update_type: "status_change"
  }

type: "dashboard.agent_status"
  payload: {
    agent_id, agent_name, status,   ← "online" or "offline"
    hostname, ip_address
  }

type: "dashboard.incident_update"
  payload: {
    incident_id, incident_ref,   ← e.g. "INC-20240115-A3F2"
    title, status, severity,
    alert_count, assigned_to,
    event_type   ← "created" / "status_changed" / "assigned" / "alerts_added"
  }

type: "dashboard.command_update"
  payload: {
    command_id, command_type, status,
    agent_id, agent_name, issued_by,
    completed_at
  }
  ← Use this to show command result notifications instead of a commands page

type: "ack"
  payload: { status: "ok" }
  ← Response to your ping

type: "pong"
  ← Response to your ping (keepalive confirmed)

─── Messages to SEND to backend ─────────────────────────────────────────────

Keepalive (every 30 seconds):
  { "type": "ping", "payload": {} }

Request current stats immediately:
  { "type": "subscribe_stats", "payload": {} }

Broadcast refresh to all connected analysts:
  { "type": "request_refresh", "payload": {} }

===========================================================================
STANDARD RESPONSE FORMAT
===========================================================================

Every response follows one of these shapes:

SUCCESS (single item):
  { "success": true, "data": { ... }, "message": "optional" }

SUCCESS (list):
  { "success": true, "data": [ ... ], "meta": { "count": 42 } }

CREATED:
  { "success": true, "data": { ... }, "message": "Created successfully." }

ERROR:
  { "success": false, "error": { "code": "not_found", "message": "...", "details": {} } }

VALIDATION ERROR:
  { "success": false, "error": { "code": "validation_error",
                                  "message": "severity: This field is required.",
                                  "details": { "severity": ["This field is required."] } } }

HTTP Status codes:
  200 → success
  201 → created
  204 → deleted
  400 → validation error
  401 → token expired → call /auth/token/refresh/
  403 → permission denied → show "access denied"
  404 → not found
  503 → agent offline
  429 → agent queue full

===========================================================================
PERMISSIONS REFERENCE
===========================================================================

Permission string     → What it unlocks in the UI
──────────────────────────────────────────────────────────────
view_dashboard        → access the app (all roles have this)
view_alerts           → Alerts page
review_alerts         → Update alert status button
manage_incidents      → Incidents page + create/assign/comment
issue_commands        → Issue Command button on agent detail
manage_agents         → Register Agent + Rotate Key + Deactivate
manage_playbooks      → Create/Edit/Delete/Trigger Playbooks
view_telemetry        → Telemetry section on agent detail
view_audit            → Audit Log tab in Administration
manage_users          → Users tab in Administration

These come from the decoded JWT token in the "permissions" array.
