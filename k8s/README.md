# Kubernetes Manifests

Minimal manifests to deploy the app + Supabase stack on any K8s cluster (EKS, GKE, AKS, k3s, microk8s).

## Files
- `namespace.yaml` — `homiebytes` namespace
- `secrets.yaml` — template (DO NOT commit real secrets; use sealed-secrets or external-secrets)
- `postgres.yaml` — StatefulSet + PVC
- `supabase.yaml` — auth/rest/realtime/storage Deployments + Services
- `app.yaml` — TanStack Start app Deployment + Service
- `ingress.yaml` — nginx-ingress with TLS (cert-manager)

## Apply
```bash
kubectl apply -f k8s/namespace.yaml
kubectl create secret generic homiebytes-env --from-env-file=.env -n homiebytes
kubectl apply -f k8s/
```

## Prerequisites
- Cluster with a default StorageClass (for PVCs)
- nginx-ingress controller installed
- cert-manager + a ClusterIssuer named `letsencrypt-prod` (for TLS)

See `../DEPLOYMENT.md` for details and the docker-compose alternative.
