pipeline {
  agent any

  options {
    buildDiscarder(logRotator(numToKeepStr: '10'))
    disableConcurrentBuilds()
    skipDefaultCheckout()
    timestamps()
    timeout(time: 20, unit: 'MINUTES')
  }

  triggers {
    githubPush()
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Validate and build') {
      steps {
        sh '''
          set -eu
          # Node versions supported by Angular 20.3.
          if ! command -v npm >/dev/null || ! node -e '
            const [major, minor] = process.versions.node.split(".").map(Number);
            const supported = major === 24 || (major === 22 && minor >= 12) || (major === 20 && minor >= 19);
            process.exit(supported && !process.version.includes("-") ? 0 : 1);
          '; then
            case "$(uname -m)" in
              x86_64) arch=x64 ;;
              aarch64|arm64) arch=arm64 ;;
              *) echo "Unsupported agent architecture: $(uname -m)" >&2; exit 1 ;;
            esac
            runtime=$(mktemp -d)
            trap 'rm -rf -- "$runtime"' EXIT
            (
              cd "$runtime"
              base=https://nodejs.org/dist/latest-v24.x
              curl -fsSL --retry 2 "$base/SHASUMS256.txt" -o sums
              grep -F -- "-linux-$arch.tar.xz" sums > checksum
              read -r digest archive < checksum
              curl -fsSL --retry 2 "$base/$archive" -o "$archive"
              sha256sum -c checksum
              tar -xJf "$archive" --strip-components=1
            )
            export PATH="$runtime/bin:$PATH"
          fi
          node --version
          npm --version
          npm ci
          npm run lint
          npm run build
        '''
      }
    }

    stage('Deploy') {
      steps {
        sh '''
          set -eu
          case "${BUILD_NUMBER:-}" in
            ''|*[!0-9]*) echo 'BUILD_NUMBER must be numeric' >&2; exit 1 ;;
          esac

          source_dir='dist/jayshare/browser'
          deploy_root='/var/www/jayshare/frontend'
          release="$deploy_root/releases/$BUILD_NUMBER"
          next_link="$deploy_root/.current.$BUILD_NUMBER.next"

          test -f "$source_dir/index.html"
          test ! -e "$release"
          install -d -m 0755 "$release"
          cp -a "$source_dir/." "$release/"
          chmod -R a+rX "$release"

          ln -s "releases/$BUILD_NUMBER" "$next_link"
          mv -Tf "$next_link" "$deploy_root/current"
        '''
      }
    }
  }
}
