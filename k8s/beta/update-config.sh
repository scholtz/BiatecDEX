kubectl apply -f deployment-beta.yaml -n biatec
kubectl delete configmap biatec-dex-beta-conf -n biatec
kubectl create configmap biatec-dex-beta-conf --from-file=conf -n biatec
kubectl rollout restart deployment/biatec-dex-beta-deployment -n biatec
