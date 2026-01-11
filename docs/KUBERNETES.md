# Kubernetes Deployment Guide

> **Production-grade Kubernetes deployment for Nivesh AI Financial Platform**

[![Kubernetes](https://img.shields.io/badge/orchestration-Kubernetes-326CE5.svg)](https://kubernetes.io/)
[![Helm](https://img.shields.io/badge/package-Helm-0F1689.svg)](https://helm.sh/)

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Deployment Components](#deployment-components)
- [Kubernetes Manifests](#kubernetes-manifests)
- [Scaling Strategy](#scaling-strategy)
- [Security & Compliance](#security--compliance)
- [Monitoring & Observability](#monitoring--observability)
- [Disaster Recovery](#disaster-recovery)
- [RBI Audit Requirements](#rbi-audit-requirements)

---

## Overview

Nivesh uses **Kubernetes** for production deployment to meet regulatory requirements and ensure:

- ✅ **High Availability** - Zero-downtime deployments
- ✅ **Auto-scaling** - Handle traffic spikes automatically
- ✅ **Self-healing** - Automatic container restart
- ✅ **Resource efficiency** - Optimal CPU/memory usage
- ✅ **Audit compliance** - Every change tracked
- ✅ **Data sovereignty** - Deploy in specific regions

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                  Kubernetes Cluster                     │
│                                                         │
│  ┌────────────────────────────────────────────────┐   │
│  │          Ingress Controller (NGINX)            │   │
│  │      (TLS termination, load balancing)         │   │
│  └──────────────────┬─────────────────────────────┘   │
│                     │                                   │
│         ┌───────────┼───────────┐                      │
│         │           │           │                      │
│   ┌─────▼─────┐ ┌──▼───────┐ ┌▼──────────┐           │
│   │ Frontend  │ │ Backend  │ │ AI Engine │           │
│   │  (3 pods) │ │ (5 pods) │ │  (2 pods) │           │
│   └───────────┘ └────┬─────┘ └─────┬─────┘           │
│                      │              │                  │
│                      ▼              ▼                  │
│   ┌─────────────────────────────────────────┐         │
│   │         StatefulSets (Databases)        │         │
│   ├─────────────┬──────────┬───────────────┤         │
│   │ PostgreSQL  │  Neo4j   │   MongoDB     │         │
│   │  (3 replicas)│(3 replicas)│(3 replicas) │        │
│   └─────────────┴──────────┴───────────────┘         │
│                                                         │
│   ┌─────────────────────────────────────────┐         │
│   │      Persistent Volumes (PV/PVC)        │         │
│   │  (Backed by cloud storage or local NFS) │         │
│   └─────────────────────────────────────────┘         │
│                                                         │
│   ┌─────────────────────────────────────────┐         │
│   │   Observability Stack (Namespace: obs)  │         │
│   │  Prometheus | Grafana | Jaeger | Loki   │         │
│   └─────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Cluster Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **Kubernetes Version** | 1.24+ | 1.28+ |
| **Nodes** | 3 worker nodes | 5+ worker nodes |
| **CPU per Node** | 4 cores | 8 cores |
| **Memory per Node** | 16 GB | 32 GB |
| **Storage** | 100 GB SSD | 500 GB SSD |

### Tools Needed

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install k3s (lightweight Kubernetes)
curl -sfL https://get.k3s.io | sh -
```

---

## Deployment Components

### Namespaces

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: nivesh-prod
---
apiVersion: v1
kind: Namespace
metadata:
  name: nivesh-observability
```

### ConfigMap Example

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nivesh-config
  namespace: nivesh-prod
data:
  POSTGRES_HOST: "postgres-service"
  NEO4J_URI: "bolt://neo4j-service:7687"
  KAFKA_BROKERS: "kafka-service:9092"
  LOG_LEVEL: "info"
```

### Secret Example

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: nivesh-secrets
  namespace: nivesh-prod
type: Opaque
data:
  POSTGRES_PASSWORD: bml2ZXNocGFzcw==  # Base64 encoded
  NEO4J_PASSWORD: bmVvNGpwYXNz
  JWT_SECRET: c2VjcmV0a2V5
```

---

## Kubernetes Manifests

### Backend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nivesh-backend
  namespace: nivesh-prod
  labels:
    app: nivesh-backend
    version: v1.0.0
spec:
  replicas: 5
  selector:
    matchLabels:
      app: nivesh-backend
  template:
    metadata:
      labels:
        app: nivesh-backend
    spec:
      containers:
      - name: backend
        image: nivesh/backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: POSTGRES_HOST
          valueFrom:
            configMapKeyRef:
              name: nivesh-config
              key: POSTGRES_HOST
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: nivesh-secrets
              key: POSTGRES_PASSWORD
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 15
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: nivesh-prod
spec:
  selector:
    app: nivesh-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

### AI Engine Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nivesh-ai-engine
  namespace: nivesh-prod
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ai-engine
  template:
    metadata:
      labels:
        app: ai-engine
    spec:
      containers:
      - name: ai-engine
        image: nivesh/ai-engine:latest
        ports:
        - containerPort: 8000
        env:
        - name: GEMINI_API_KEY
          valueFrom:
            secretKeyRef:
              name: nivesh-secrets
              key: GEMINI_API_KEY
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "8Gi"
            cpu: "4000m"
---
apiVersion: v1
kind: Service
metadata:
  name: ai-engine-service
  namespace: nivesh-prod
spec:
  selector:
    app: ai-engine
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
```

### PostgreSQL StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: nivesh-prod
spec:
  serviceName: postgres-service
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: "nivesh"
        - name: POSTGRES_USER
          value: "nivesh"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: nivesh-secrets
              key: POSTGRES_PASSWORD
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
```

### Ingress Configuration

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nivesh-ingress
  namespace: nivesh-prod
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.nivesh.ai
    secretName: nivesh-tls
  rules:
  - host: api.nivesh.ai
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 80
      - path: /ai
        pathType: Prefix
        backend:
          service:
            name: ai-engine-service
            port:
              number: 80
```

---

## Scaling Strategy

### Horizontal Pod Autoscaler (HPA)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: nivesh-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nivesh-backend
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Vertical Pod Autoscaler (VPA)

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: ai-engine-vpa
  namespace: nivesh-prod
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nivesh-ai-engine
  updatePolicy:
    updateMode: "Auto"
```

---

## Security & Compliance

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ai-engine-policy
  namespace: nivesh-prod
spec:
  podSelector:
    matchLabels:
      app: ai-engine
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: nivesh-backend
    ports:
    - protocol: TCP
      port: 8000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
```

### Pod Security Standards

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: nivesh-prod
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### RBAC Configuration

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: nivesh-prod
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: nivesh-prod
subjects:
- kind: ServiceAccount
  name: nivesh-backend
  namespace: nivesh-prod
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

---

## Monitoring & Observability

### Prometheus ServiceMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: nivesh-backend-monitor
  namespace: nivesh-prod
spec:
  selector:
    matchLabels:
      app: nivesh-backend
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

### Logging with Fluentd

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
  namespace: nivesh-observability
spec:
  selector:
    matchLabels:
      name: fluentd
  template:
    metadata:
      labels:
        name: fluentd
    spec:
      containers:
      - name: fluentd
        image: fluent/fluentd-kubernetes-daemonset:v1
        env:
        - name: FLUENT_ELASTICSEARCH_HOST
          value: "elasticsearch-service"
        volumeMounts:
        - name: varlog
          mountPath: /var/log
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
```

---

## Disaster Recovery

### Backup Strategy

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: nivesh-prod
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: nivesh/backup-tool:latest
            command: ["/bin/sh", "-c"]
            args:
            - pg_dump -h postgres-service -U nivesh nivesh > /backups/nivesh-$(date +%Y%m%d).sql
            volumeMounts:
            - name: backup-storage
              mountPath: /backups
          restartPolicy: OnFailure
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
```

---

## RBI Audit Requirements

### Control Requirements for Financial Apps

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| **Data Sovereignty** | Deploy in Indian data centers only | ✅ Region: ap-south-1 |
| **AI Explainability** | Decision trace stored in audit DB | ✅ Every prediction logged |
| **Kill Switch** | Emergency shutdown ConfigMap | ✅ Immediate rollback |
| **GDPR/Consent** | User data deletion within 30 days | ✅ CronJob for deletion |
| **Audit Logs** | Immutable log storage (7 years) | ✅ Write-once storage |
| **Change Tracking** | GitOps with ArgoCD | ✅ Every deployment tracked |

### Emergency Kill Switch

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: emergency-controls
  namespace: nivesh-prod
data:
  AI_ENABLED: "true"  # Set to "false" to disable AI
  TRADING_ENABLED: "true"
  MAX_TRANSACTION_LIMIT: "100000"
```

The backend checks this ConfigMap every 10 seconds. Changing `AI_ENABLED` to `false` immediately disables all AI features without redeployment.

### GitOps with ArgoCD

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nivesh-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/nivesh-k8s
    targetRevision: main
    path: manifests/production
  destination:
    server: https://kubernetes.default.svc
    namespace: nivesh-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

**Benefits:**
- Every change is a Git commit (audit trail)
- Automatic rollback if deployment fails
- Visual diff of infrastructure changes
- Regulators can inspect the repository

---

## Deployment Commands

```bash
# Apply all manifests
kubectl apply -f infra/kubernetes/

# Check deployment status
kubectl get pods -n nivesh-prod

# View logs
kubectl logs -f deployment/nivesh-backend -n nivesh-prod

# Scale manually
kubectl scale deployment nivesh-backend --replicas=10 -n nivesh-prod

# Rollback
kubectl rollout undo deployment/nivesh-backend -n nivesh-prod

# Check resource usage
kubectl top pods -n nivesh-prod
```

---

## Why Kubernetes for Financial Apps?

| Traditional Deployment | Kubernetes |
|------------------------|------------|
| Manual scaling | Auto-scaling based on load |
| Downtime during updates | Zero-downtime rolling updates |
| Manual recovery | Self-healing (automatic restart) |
| Hard to audit | Every change in Git |
| Regional lock-in | Multi-region support |
| No resource limits | CPU/memory quotas enforced |

---

## Next Steps

- Set up CI/CD pipeline with GitHub Actions
- Configure Prometheus alerts for critical metrics
- Implement disaster recovery testing
- Create runbooks for common incidents

---

**Last Updated:** January 2026  
**Maintained By:** Nivesh DevOps Team  
**Related Docs:** [CONTAINERIZATION.md](CONTAINERIZATION.md), [TECH_STACK.md](TECH_STACK.md)
