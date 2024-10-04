# Website change monitor action

Sometimes you need to monitor a website, or a particular part of it, for changes in its content.
There are some services that provide this functionality, but usually require a paid subscription to monitor at an acceptable frequency.

This Action provides this functionality for free by leveraging the GitHub infrastructure.
The only limit is that checks can occur at a minimum of 5 minutes intervals, as per the limits of GitHub Actions.
For now, it supports notifications via Discord and Slack webhooks.

## Usage

1. Create a [new repository](https://github.com/new) or choose an existing one.
2. Create a [personal access token](https://github.com/settings/tokens) with access to the chosen repository and read and write access to `Variables`.
   
   Copy the token to the clipboard.
4. Navigate to the chosen repository and go to the `Settings` tab.
   
   Click on `Secrets and Variables`, `Actions` and then `New repository secret`.
   
   In the `Name` field, type `GH_TOKEN` and in the `Secret` field, paste the token copied in step 2.
5. Create a new workflow file in the `.github/workflows` directory of the repository with a `.yaml` extension and the following content adjusted to your needs:

```yaml
on:
    schedule:
        - cron: "*/5 * * * *" # every 5 minutes (minimum interval), replace with desired cron expression
jobs:
    monitoring_job:
        runs-on: ubuntu-latest
        name: "Monitoring job"
        steps:
            - name: Checkout
              uses: actions/checkout@v4
            - name: "Check for updates"
              uses: lcian/website-change-monitor-action@v1
              id: check
              with:
                  url: "https://example.com" # replace with desired URL
                  selector: "#content-core" # (optional) replace with CSS selector of element you want to monitor, omit this to monitor the whole page or if the page is not HTML
                  discord-webhook-url: "https://discord.com/api/webhooks/..." # (optional) replace with Discord webhook URL if you want to get Discord notifications
                  slack-webhook-url: "https://hooks.slack.com/services/..." # (optional) replace with Slack webhook URL if you want to get Slack notifications
              env:
                  GH_TOKEN: ${{ secrets.GH_TOKEN }}
```

5. Commit the changes and push them to the repository.

   You should see the workflow running on your desired schedule in the `Actions` tab of the repository.

   If you want to disable the checker, just delete the file you created at step 5.

## How it works

The code for this Action is very simple, it uses `axios` to send HTTP requests and `cheerio` to extract the contents of the HTML element corresponding to a particular CSS selector.

The data is hashed and stored in a repository `Variable`. Whenever the current hash is different from the previous one, it means that the content has changed, so we fire alerts to the provided webhook URLs.

## Contributing

Feel free to open an [issue](https://github.com/lcian/website-change-monitor-action/issues/new) or a [pull request](https://github.com/lcian/website-change-monitor-action/pulls).
