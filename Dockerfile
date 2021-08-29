FROM node:14
# Reference: https://nodejs.org/en/docs/guides/nodejs-docker-webapp/

WORKDIR /root
ENV APPDIR=/root
ENV ELECTRON_CACHE=$HOME/.cache/electron
ENV ELECTRON_BUILDER_CACHE=$HOME/.cache/electron-builder
ENV PATH="$HOME/.yarn/bin:$PATH"

# Clone repository and set as workdir 
RUN cd /root 
RUN git clone https://github.com/zeroQ-av/companion.git
RUN mv companion/.[!.]* .
RUN mv companion/* .
RUN rm -rf companion

    # Installation Prep
RUN curl -L https://yarnpkg.com/latest.tar.gz | tar xvz && mv yarn-v* $HOME/.yarn
RUN apt-get update && apt-get install -y --no-install-recommends apt-utils 
RUN apt-get install -y --no-install-recommends libudev-dev 
RUN apt-get install -y --no-install-recommends libgusb-dev 
RUN $APPDIR/tools/update.sh 
    #$APPDIR/tools/build_writefile.sh

#EXPOSE 8000
#ENTRYPOINT ["./headless.js", "eth0"]
