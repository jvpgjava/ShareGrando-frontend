pipeline {
  agent any

  tools {
    nodejs 'Node 24 Jayshare'
  }

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
        sh 'node --version'
        sh 'npm ci'
        sh 'npm run lint'
        sh 'npm run build'
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
