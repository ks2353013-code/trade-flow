FROM clamav/clamav:1.4.3

COPY clamd.conf /etc/clamav/clamd.conf

EXPOSE 3310
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD clamdscan --ping 1 || exit 1
