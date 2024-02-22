kubectl apply -f deployment-main.yaml -n biatec
kubectl delete configmap biatec-dex-main-conf -n biatec
kubectl create configmap biatec-dex-main-conf --from-file=conf -n biatec
kubectl rollout restart deployment/biatec-dex-main-deployment -n biatec
