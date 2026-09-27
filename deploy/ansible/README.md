# Deploying with Ansible

This playbook turns a fresh Debian 12 Compute Engine VM into a running ExpenseHub
server. It installs Docker, adds swap, lets Docker pull from Artifact Registry,
writes the secrets file, runs database migrations and starts the app on port 80.

Run it from **Google Cloud Shell**, which already has `gcloud` signed in to your
project.

## Before you start

These must already exist (the GCP setup script creates them):

- the VM `expensehub-vm` in `us-central1-a`, running as the `expensehub-app`
  service account
- the Cloud SQL instance `expensehub-db` with a database and user named `expensehub`
- the receipts bucket
- both images in Artifact Registry, built with `deploy/cloudbuild.yaml`

## One-time setup in Cloud Shell

```bash
# 1. Get the code
git clone https://github.com/kalyani8063/ExpenseHub-multitenant-expense-tracker.git
cd ExpenseHub-multitenant-expense-tracker/deploy/ansible

# 2. Install Ansible (includes the community.docker collection)
pip install --user ansible
export PATH="$HOME/.local/bin:$PATH"

# 3. Create an SSH key and check you can reach the VM through IAP
gcloud compute ssh expensehub-vm --zone=us-central1-a --tunnel-through-iap --command="echo ok"

# 4. Fill in your settings
cp inventory.ini.example inventory.ini   # edit: username, project ID, DB IP
cp secrets.yml.example secrets.yml       # edit: Clerk keys, DB password
ansible-vault encrypt secrets.yml        # choose a vault password
```

## Deploy (and every redeploy)

```bash
ansible-playbook playbook.yml --ask-vault-pass
```

The last task waits until the app answers on port 80. Open
`http://<VM external IP>` in a browser:

```bash
gcloud compute instances describe expensehub-vm --zone=us-central1-a \
  --format="value(networkInterfaces[0].accessConfigs[0].natIP)"
```

To ship a new version: rebuild the images with Cloud Build, then run the
playbook again. It pulls the new images and recreates the container.

## What each part is for

| File | Purpose |
|---|---|
| `playbook.yml` | The deployment steps, in order |
| `inventory.ini` | Which VM to configure and project-specific values (gitignored) |
| `secrets.yml` | Clerk keys and the database password, encrypted with Ansible Vault (gitignored) |
| `group_vars/expensehub.yml` | Image names derived from the inventory values |
| `templates/app.env.j2` | The container's environment file, written to `/opt/expensehub/app.env` with root-only permissions |
